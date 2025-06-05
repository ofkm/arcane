import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseDockerRunCommand, convertToDockerCompose } from '$lib/services/converter-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

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

	const { dockerRunCommand } = bodyResult.data as { dockerRunCommand: string };

	if (!dockerRunCommand || !dockerRunCommand.trim()) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Docker run command is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	try {
		const parsed = parseDockerRunCommand(dockerRunCommand);
		const dockerCompose = convertToDockerCompose(parsed);

		// Extract environment variables for the .env file
		const envVars =
			parsed.environment
				?.map((env) => {
					// Convert -e KEY=value format to KEY=value
					return env;
				})
				.join('\n') || '';

		return json({
			success: true,
			dockerCompose,
			envVars,
			serviceName: parsed.name || 'app'
		});
	} catch (error) {
		console.error('Error converting docker run command:', error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to parse docker run command. Please check the syntax.',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR
		};
		return json(response, { status: 500 });
	}
};
