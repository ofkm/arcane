import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStack } from '$lib/services/docker/stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ request }) => {
	const bodyResult = await tryCatch(request.json());
	if (bodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const body = bodyResult.data;
	const name = body.name?.toString();
	const composeContent = body.composeContent?.toString();
	const envContent = body.envContent?.toString();

	if (!name) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack name is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	if (!composeContent) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Compose file content is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(createStack(name, composeContent, envContent));
	if (result.error) {
		console.error('API Error creating stack:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to create stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const newStack = result.data;
	return json({
		success: true,
		stack: newStack,
		message: `Stack "${newStack.name}" created successfully.`
	});
};
