import type { RequestHandler } from './$types';
import { getStack } from '$lib/services/docker/stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { getDockerClient } from '$lib/services/docker/core';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { URL } from 'url';
import { getSettings } from '$lib/services/settings-service';
import type { RegistryCredential } from '$lib/types/settings.type';
import { areRegistriesEquivalent, parseImageNameForRegistry } from '$lib/utils/registry.utils';
import { json } from '@sveltejs/kit';

// Define AuthConfig interface (as used by dockerode)
interface AuthConfig {
	username: string;
	password?: string;
	serveraddress: string;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const id = params.stackId;
	const docker = getDockerClient();

	const reqUrl = new URL(request.url);
	const platform = reqUrl.searchParams.get('platform');

	const settings = await getSettings();

	const stackResult = await tryCatch(getStack(id));
	if (stackResult.error || !stackResult.data || !stackResult.data.composeContent) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack not found or has no compose content',
			code: ApiErrorCode.NOT_FOUND,
			details: stackResult.error
		};
		return json(response, { status: 404 });
	}
	const stack = stackResult.data;

	const composeLines = stack.composeContent!.split('\n');
	const imageLines = composeLines.filter((line) => line.trim().startsWith('image:') || line.includes(' image:'));

	if (imageLines.length === 0) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'No images found in stack compose file',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const imageNames = imageLines.map((line) => {
		const imagePart = line.split('image:')[1].trim();
		const imageName = imagePart.replace(/['"]/g, '').split(' ')[0];
		// Ensure it has a tag
		return imageName.includes(':') ? imageName : `${imageName}:latest`;
	});

	// Results array to track pull status for each image
	const pullResults: Array<{ image: string; success: boolean; error?: string; details?: any }> = [];
	let overallSuccess = true;

	// Pull each image sequentially
	for (const imageName of imageNames) {
		try {
			// Setup auth if needed
			let pullAuthConfig: AuthConfig | undefined = undefined;
			const { registry: imageRegistryHost } = parseImageNameForRegistry(imageName);

			// Try to find stored credentials for the image's registry
			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));

				if (storedCredential) {
					let serverAddressForAuth = storedCredential.url;
					// Docker Hub's canonical serveraddress for authconfig
					if (areRegistriesEquivalent(storedCredential.url, 'docker.io')) {
						serverAddressForAuth = 'https://index.docker.io/v1/';
					}
					pullAuthConfig = {
						username: storedCredential.username,
						password: storedCredential.password,
						serveraddress: serverAddressForAuth
					};
				}
			}

			const pullOptions: { authconfig?: AuthConfig; platform?: string } = {};
			if (pullAuthConfig) {
				pullOptions.authconfig = pullAuthConfig;
			}
			if (platform) {
				pullOptions.platform = platform;
			}

			// Pull the image and wait for it to complete
			const pullStream = await docker.pull(imageName, pullOptions);

			// Create a new promise to handle the pull stream
			await new Promise<void>((resolve, reject) => {
				docker.modem.followProgress(
					pullStream,
					(err: Error | null) => {
						if (err) {
							const errMsg = extractDockerErrorMessage(err);
							pullResults.push({
								image: imageName,
								success: false,
								error: errMsg,
								details: err
							});
							overallSuccess = false;
							reject(err);
						} else {
							pullResults.push({
								image: imageName,
								success: true
							});
							resolve();
						}
					},
					() => {
						// Don't do anything with progress events
					}
				);
			}).catch(() => {
				// Catch the rejection to prevent it from stopping the loop
				// We already recorded the error in the handler above
			});
		} catch (error: any) {
			const errMsg = error.message || 'Unknown error pulling image';
			pullResults.push({
				image: imageName,
				success: false,
				error: errMsg,
				details: error
			});
			overallSuccess = false;
		}
	}

	// Return final result
	if (overallSuccess) {
		return json({
			success: true,
			message: `All images for stack ${id} pulled successfully.`,
			images: pullResults
		});
	} else {
		// Get the failed images and their error messages
		const failedImages = pullResults.filter((r) => !r.success);
		const errorMessages = failedImages.map((img) => `${img.image}: ${img.error}`);

		const response: ApiErrorResponse = {
			success: false,
			error: errorMessages.join('; '),
			code: ApiErrorCode.DOCKER_API_ERROR,
			failedCount: failedImages.length,
			details: pullResults
		};
		return json(response, { status: 500 });
	}
};
