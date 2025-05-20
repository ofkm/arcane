import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { destroyStack } from '$lib/services/docker/stack-custom-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const id = params.stackId;
	const removeFiles = url.searchParams.get('removeFiles') === 'true';
	const removeVolumes = url.searchParams.get('removeVolumes') === 'true';

	if (!id) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Pass removeFiles parameter to destroyStack function
	const result = await tryCatch(destroyStack(id, removeVolumes, removeFiles));

	if (result.error) {
		console.error(`API Error destroying stack ${id}:`, result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to destroy stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 409 });
	}

	if (result.data) {
		return json({
			success: true,
			message: `Stack Destroyed Successfully${removeFiles ? ' (including files)' : ''}`
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
