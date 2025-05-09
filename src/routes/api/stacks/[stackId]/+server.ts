import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { updateStack } from '$lib/services/docker/stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const PUT: RequestHandler = async ({ params, request }) => {
	const { stackId } = params;
	const { name, composeContent, autoUpdate, envContent } = await request.json();

	const result = await tryCatch(updateStack(stackId, { name, composeContent, autoUpdate, envContent }));

	if (result.error) {
		console.error('Error updating stack:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to update stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		message: 'Stack updated successfully'
	});
};
