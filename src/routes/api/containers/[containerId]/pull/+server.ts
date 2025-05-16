import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getContainer } from '$lib/services/docker/container-service';
import { pullImage } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	// Try to get the container
	const getResult = await tryCatch(getContainer(containerId));
	if (getResult.error) {
		console.error(`API Error pulling image for container ${containerId}:`, getResult.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(getResult.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: getResult.error
		};

		return json(response, { status: 500 });
	}

	if (!getResult.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Container not found',
			code: ApiErrorCode.NOT_FOUND
		};
		return json(response, { status: 404 });
	}

	const imageName = getResult.data.Image;

	// Try to pull the image
	const pullResult = await tryCatch(pullImage(imageName));
	if (pullResult.error) {
		console.error(`API Error pulling image ${imageName} for container ${containerId}:`, pullResult.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(pullResult.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: pullResult.error
		};

		return json(response, { status: 500 });
	}

	return json({
		success: true,
		message: `Container image ${imageName} pulled successfully`
	});
};
