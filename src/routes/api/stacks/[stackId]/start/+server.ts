import { startStack } from '$lib/services/docker/stack-service';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.stackId;

	const result = await tryCatch(startStack(id));

	if (result.error) {
		console.error(`API Error starting stack ${id}:`, result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to start stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		message: `Stack started successfully`
	});
};
