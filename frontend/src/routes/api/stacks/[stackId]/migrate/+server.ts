import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { migrateStackToNameFolder } from '$lib/services/docker/stack-migration-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ params }) => {
	const { stackId } = params;

	if (!stackId) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Missing stackId',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(migrateStackToNameFolder(stackId));

	if (result.error) {
		console.error('Error migrating stack:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to migrate stack',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		message: `Stack "${stackId}" migrated successfully.`
	});
};
