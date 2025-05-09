import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { restartContainer } from '$lib/services/docker/container-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const containerId = params.containerId;

	const result = await tryCatch(restartContainer(containerId));

	if (result.error) {
		console.error(`API Error restarting container ${containerId}:`, result.error);

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
		message: `Container restarted successfully`
	});
};
