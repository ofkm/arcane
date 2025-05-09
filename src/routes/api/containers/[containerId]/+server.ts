import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getContainer } from '$lib/services/docker/container-service';
import { tryCatch } from '$lib/utils/try-catch';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';

export const GET: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	const result = await tryCatch(getContainer(containerId));

	if (result.error) {
		console.error(`API Error getting container ${containerId}:`, result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};

		return json(response, { status: 500 });
	}

	if (!result.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Container not found',
			code: ApiErrorCode.NOT_FOUND
		};
		return json(response, { status: 404 });
	}

	return json(result.data);
};
