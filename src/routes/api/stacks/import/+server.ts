import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { importExternalStack } from '$lib/services/docker/stack-custom-service';
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
	const { stackId, stackName } = bodyResult.data;

	if (!stackId) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stack ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(importExternalStack(stackId));

	if (result.error) {
		console.error(`Error importing stack ${stackId}:`, result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to import stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const importedStack = result.data;
	console.log(`Successfully imported stack: ${stackId} (${stackName || importedStack.name})`);

	return json({
		success: true,
		stack: importedStack,
		message: `Successfully imported stack ${importedStack.name}`
	});
};
