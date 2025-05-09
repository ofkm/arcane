import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { stopStack } from '$lib/services/docker/stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	const result = await tryCatch(stopStack(id));

	if (result.error) {
		console.error(`API Error stopping stack ${id}:`, result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to stop stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	if (result.data) {
		return json({
			success: true,
			message: `Stack stopped successfully`
		});
	} else {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to stop stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR
		};
		return json(response, { status: 500 });
	}
};
