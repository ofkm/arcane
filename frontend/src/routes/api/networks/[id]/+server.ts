import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeNetwork } from '$lib/services/docker/network-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params }) => {
	const networkId = params.id;

	if (!networkId) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Network ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(removeNetwork(networkId));

	if (result.error) {
		console.error(`API Error removing network ${networkId}:`, result.error);

		// Handle specific error cases with appropriate status codes
		if (result.error.message?.includes('not found')) {
			const response: ApiErrorResponse = {
				success: false,
				error: result.error.message,
				code: ApiErrorCode.NOT_FOUND,
				details: result.error
			};
			return json(response, { status: 404 });
		}

		if (result.error.message?.includes('cannot be removed')) {
			const response: ApiErrorResponse = {
				success: false,
				error: result.error.message,
				code: ApiErrorCode.CONFLICT,
				details: result.error
			};
			return json(response, { status: 409 });
		}

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
		message: `Network ${networkId} deleted.`
	});
};
