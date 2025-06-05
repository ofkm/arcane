import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeVolume } from '$lib/services/docker/volume-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const DELETE: RequestHandler = async ({ params, url }) => {
	const { name } = params;
	const force = url.searchParams.get('force') === 'true';

	const result = await tryCatch(removeVolume(name, force));

	if (result.error) {
		console.error('API Error removing volume:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to remove volume',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({ success: true });
};
