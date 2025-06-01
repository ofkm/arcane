import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { databaseStackService } from '$lib/services/database/database-stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { getDockerClient } from '$lib/services/docker/core';
import { normalizeHealthcheckTest } from '$lib/services/docker/stack-service';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dump as yamlDump } from 'js-yaml';

export const POST: RequestHandler = async ({ request }) => {
	const bodyResult = await tryCatch(request.json());
	if (bodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const { stackId, stackName } = bodyResult.data;

	if (!stackId) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Implement the external stack discovery logic
	try {
		// 1. First, check if we can find the stack by ID
		const docker = await getDockerClient();
		const containers = await docker.listContainers({ all: true });

		// Filter containers that belong to this stack
		const stackContainers = containers.filter((container: any) => {
			const labels = container.Labels || {};
			return labels['com.docker.compose.project'] === stackId;
		});

		if (stackContainers.length === 0) {
			const response: ApiErrorResponse = {
				success: false,
				error: `No containers found for stack '${stackId}'`,
				code: ApiErrorCode.NOT_FOUND
			};
			return json(response, { status: 404 });
		}

		// 2. Try to locate the compose file (if available)
		const container = stackContainers[0]; // Use the first container to get labels
		const labels = container.Labels || {};

		// 3. Read the compose file if available, or create a new one
		let composeContent = '';
		let envContent: string | undefined = undefined;
		let actualComposeFilePathUsed = '';

		const configFilesLabel = labels['com.docker.compose.project.config_files'];

		if (configFilesLabel) {
			const potentialComposePaths = configFilesLabel
				.split(',')
				.map((p: string) => p.trim())
				.filter((p: string) => p);

			let pathToTry = '';
			if (potentialComposePaths.length > 0) {
				// Prioritize common primary compose file names
				const primaryNames = ['compose.yaml', 'docker-compose.yml', 'compose.yml', 'docker-compose.yaml'];
				for (const name of primaryNames) {
					// Check if any of the paths end with a primary name
					const foundPath = potentialComposePaths.find((p: string) => path.basename(p) === name);
					if (foundPath) {
						pathToTry = foundPath;
						break;
					}
				}

				// If no primary name found in the list, try the first one from the list.
				if (!pathToTry) {
					pathToTry = potentialComposePaths[0];
				}
			}

			if (pathToTry) {
				actualComposeFilePathUsed = pathToTry;
				try {
					console.log(`Attempting to read compose file for import from: ${actualComposeFilePathUsed}`);
					composeContent = await fs.readFile(actualComposeFilePathUsed, 'utf8');
					console.log(`Successfully read compose file: ${actualComposeFilePathUsed}. Content length: ${composeContent.length}`);

					// Attempt to read .env file from the same directory
					const composeFileDir = path.dirname(actualComposeFilePathUsed);
					const envFilePath = path.join(composeFileDir, '.env');
					try {
						envContent = await fs.readFile(envFilePath, 'utf8');
						console.log(`Successfully read .env file from: ${envFilePath}`);
					} catch (envErr) {
						const nodeEnvErr = envErr as NodeJS.ErrnoException;
						if (nodeEnvErr.code === 'ENOENT') {
							console.log(`.env file not found at ${envFilePath}, proceeding without it.`);
						} else {
							console.warn(`Could not read .env file at ${envFilePath} during import:`, envErr);
						}
					}
				} catch (err) {
					console.warn(`Could not read compose file at ${actualComposeFilePathUsed} during import:`, err);
					// composeContent will remain empty, leading to generation logic below
				}
			} else {
				console.warn(`No suitable compose file path found in 'com.docker.compose.project.config_files' label: "${configFilesLabel}"`);
			}
		} else {
			console.warn(`Label 'com.docker.compose.project.config_files' not found for stack '${stackId}'. Will attempt to generate compose file.`);
		}

		// 4. If we couldn't read the compose file, generate one based on container inspection
		if (!composeContent) {
			console.log(`Generating compose file for stack '${stackId}' as no existing file could be read or found.`);
			// Create a basic compose file from container inspection
			const services: Record<string, { image: string }> = {};

			for (const cont of stackContainers) {
				const containerLabels = cont.Labels || {};
				const serviceName = containerLabels['com.docker.compose.service'] || cont.Names[0]?.replace(`/${stackId}_`, '').replace(/_\d+$/, '') || `service_${cont.Id.substring(0, 8)}`;

				services[serviceName] = {
					image: cont.Image
				};
			}

			// Generate the compose file content
			composeContent = `# Generated compose file for imported stack: ${stackId}
# This was automatically generated by Arcane from an external stack.
# The original compose file could not be read from: ${actualComposeFilePathUsed || 'path not specified in labels'}.
# You may need to adjust this manually for correct operation.

services:
${yamlDump({ services }, { indent: 2 }).substring('services:\n'.length)}`;
		}

		// 5. Create a new stack in Arcane's managed stacks using the database service
		const result = await tryCatch(databaseStackService.importStack(stackName || stackId, normalizeHealthcheckTest(composeContent), envContent));

		if (result.error) {
			console.error(`Error importing stack ${stackId}:`, result.error);
			const response: ApiErrorResponse = {
				success: false,
				error: result.error.message || 'Failed to import stack',
				code: ApiErrorCode.INTERNAL_SERVER_ERROR,
				details: result.error
			};
			return json(response, { status: 500 });
		}

		const importedStack = result.data;
		console.log(`Successfully imported stack: ${stackId} (${stackName || importedStack.name})`);

		return json({
			success: true,
			stack: importedStack,
			message: `Successfully imported stack ${importedStack.name}`
		});
	} catch (error) {
		console.error(`Error during stack import:`, error);
		const response: ApiErrorResponse = {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to import stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: error
		};
		return json(response, { status: 500 });
	}
};
