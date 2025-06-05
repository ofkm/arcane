import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { removeContainer } from '$lib/services/docker/container-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const containerId = params.containerId;
	const force = url.searchParams.has('force') ? url.searchParams.get('force') === 'true' : false;

	const result = await tryCatch(removeContainer(containerId, force));

	if (result.error) {
		console.error(`API Error Deleting container ${containerId}:`, result.error);

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
		message: `Container Deleted Successfully`
	});
};
