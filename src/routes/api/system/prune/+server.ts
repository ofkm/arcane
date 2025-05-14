import { json } from '@sveltejs/kit';
import { pruneSystem } from '$lib/services/docker/system-service';
import type { RequestHandler } from './$types';
import { formatBytes } from '$lib/utils/bytes.util';
import type { PruneType } from '$lib/types/actions.type';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

const allowedPruneTypes: PruneType[] = ['containers', 'images', 'networks', 'volumes'];

export const POST: RequestHandler = async ({ url }) => {
	const typesParam = url.searchParams.get('types');
	if (!typesParam) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Missing required query parameter: types',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const requestedTypes = typesParam.split(',').map((t) => t.trim().toLowerCase()) as PruneType[];
	const validTypes = requestedTypes.filter((t) => allowedPruneTypes.includes(t));

	if (validTypes.length === 0) {
		const response: ApiErrorResponse = {
			success: false,
			error: `No valid resource types provided for pruning. Allowed types: ${allowedPruneTypes.join(', ')}`,
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	console.log(`API: POST /api/system/prune - Pruning types: ${validTypes.join(', ')}`);

	const result = await tryCatch(pruneSystem(validTypes));

	if (result.error) {
		console.error('API Error (pruneSystem):', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to prune system.',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const results = result.data;
	let totalSpaceReclaimed = 0;
	let hasErrors = false;
	const errorMessages: string[] = [];

	if (Array.isArray(results)) {
		results.forEach((res) => {
			if (res) {
				if (typeof res.SpaceReclaimed === 'number') {
					totalSpaceReclaimed += res.SpaceReclaimed;
				}
				if (res.error) {
					hasErrors = true;
					errorMessages.push(`${res.type || 'Unknown'}: ${res.error}`);
				}
			}
		});
	}

	let message = `System prune completed for: ${validTypes.join(', ')}.`;
	if (totalSpaceReclaimed > 0) {
		message += ` Reclaimed ${formatBytes(totalSpaceReclaimed)}.`;
	}
	if (hasErrors) {
		message += ` Errors occurred: ${errorMessages.join('; ')}`;
		console.warn('Prune completed with errors:', errorMessages);
		return json({ success: false, results, spaceReclaimed: totalSpaceReclaimed, message }, { status: 200 });
	}

	console.log('API: System prune completed successfully.');
	return json({ success: true, results, spaceReclaimed: totalSpaceReclaimed, message });
};
