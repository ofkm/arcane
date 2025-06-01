import type { RequestHandler } from './$types';
import { databaseStackService } from '$lib/services/database/database-stack-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async () => {
	const result = await tryCatch(databaseStackService.migrateFileBasedStacks());

	if (result.error) {
		console.error('API Error migrating file-based stacks:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to migrate stacks',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const migrationResult = result.data;

	if (migrationResult.failed > 0) {
		const response: ApiErrorResponse = {
			success: false,
			error: `Migration completed with ${migrationResult.failed} failures`,
			code: ApiErrorCode.BAD_REQUEST,
			details: {
				successful: migrationResult.success,
				failed: migrationResult.failed,
				errors: migrationResult.errors
			}
		};
		return json(response, { status: 207 }); // 207 Multi-Status for partial success
	}

	return json({
		success: true,
		message: `Successfully migrated ${migrationResult.success} file-based stacks to database`,
		data: {
			successful: migrationResult.success,
			failed: migrationResult.failed,
			errors: migrationResult.errors
		}
	});
};
