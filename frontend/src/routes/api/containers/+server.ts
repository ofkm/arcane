import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createContainer } from '$lib/services/docker/container-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';
import type { ContainerCreateOptions } from 'dockerode';

export const POST: RequestHandler = async ({ request }) => {
	const config = (await request.json()) as ContainerCreateOptions;

	if (!config.name || !config.Image) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Container name and image are required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(createContainer(config));

	if (result.error) {
		console.error('Error creating container:', result.error);

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
		container: result.data
	});
};
