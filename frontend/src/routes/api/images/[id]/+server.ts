import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeImage } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const { id } = params;
	const force = url.searchParams.get('force') === 'true';

	if (!id) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Image ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(removeImage(id, force));

	if (result.error) {
		console.error('Error removing image:', result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true
	});
};
