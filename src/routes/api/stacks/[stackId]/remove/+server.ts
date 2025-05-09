import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { removeStack } from '$lib/services/docker/stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	if (!id) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(removeStack(id));

	if (result.error) {
		console.error(`API Error removing stack ${id}:`, result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to remove stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 409 });
	}

	if (result.data) {
		return json({
			success: true,
			message: `Stack removed successfully`
		});
	} else {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to remove stack',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
};
