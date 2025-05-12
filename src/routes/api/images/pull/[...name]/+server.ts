import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pullImage } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';
import { getSettings } from '$lib/services/settings-service';
import { areRegistriesEquivalent } from '$lib/utils/registry.utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const fullPath = params.name;

	if (!fullPath) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Image reference is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	let body;
	try {
		body = await request.json();
	} catch (error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid request body',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const platform = body?.platform;
	const tag = body?.tag || 'latest';
	const imageRef = fullPath.includes(':') ? fullPath : `${fullPath}:${tag}`;

	// Extract registry host from image name for auth lookup
	const imageName = imageRef.split(':')[0];
	const imageRegistryHost = imageName.includes('/') ? (imageName.split('/')[0].includes('.') || imageName.split('/')[0].includes(':') ? imageName.split('/')[0] : 'docker.io') : 'docker.io';

	// Explicit credentials from request body, if provided
	const authConfig = body?.auth || {};
	let authOptions = {};

	// If no explicit credentials in body, check settings for stored credentials
	if (!authConfig.username && !authConfig.password) {
		try {
			const settings = await getSettings();

			if (settings.registryCredentials && settings.registryCredentials.length > 0) {
				const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));

				if (storedCredential) {
					console.log(`Using stored credentials for ${imageRegistryHost} as ${storedCredential.username}`);

					// Docker Hub's canonical serveraddress for authconfig
					const serverAddress = imageRegistryHost === 'docker.io' ? 'https://index.docker.io/v1/' : imageRegistryHost;

					authOptions = {
						username: storedCredential.username,
						password: storedCredential.password,
						serveraddress: serverAddress
					};
				} else if (imageRegistryHost !== 'docker.io') {
					// Only log warnings for non-Docker Hub registries
					console.log(`No stored credentials found for ${imageRegistryHost}. Attempting unauthenticated pull.`);
				}
			}
		} catch (error) {
			console.error('Error loading authentication settings:', error);
		}
	} else {
		// Use explicit credentials from request body
		authOptions = authConfig;
	}

	console.log(`API: Pulling image "${imageRef}"...`);
	const result = await tryCatch(pullImage(imageRef, platform, authOptions));

	if (result.error) {
		console.error('Error pulling image:', result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		message: `Image "${imageRef}" pulled successfully.`
	});
};
