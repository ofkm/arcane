import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pullImage } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

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

	console.log(`API: Pulling image "${imageRef}"...`);
	const result = await tryCatch(pullImage(imageRef, platform));

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
