import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listImages } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async () => {
	const result = await tryCatch(listImages());
	console.log('Result:', result);

	if (result.error) {
		console.error('Error fetching images:', result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json(result.data);
};
