import { json, error as serverError } from '@sveltejs/kit';
import { pruneSystem } from '$lib/services/docker/system-service';
import type { RequestHandler } from './$types';
import { formatBytes } from '$lib/utils'; // Import formatBytes

// Define allowed types
type PruneType = 'containers' | 'images' | 'networks' | 'volumes';
const allowedPruneTypes: PruneType[] = ['containers', 'images', 'networks', 'volumes'];

export const POST: RequestHandler = async ({ url }) => {
	// Get types from query parameters, e.g., /api/docker/system/prune?types=containers,images
	const typesParam = url.searchParams.get('types');
	if (!typesParam) {
		throw serverError(400, 'Missing required query parameter: types');
	}

	// Validate and parse types
	const requestedTypes = typesParam.split(',').map((t) => t.trim().toLowerCase()) as PruneType[];
	const validTypes = requestedTypes.filter((t) => allowedPruneTypes.includes(t));

	if (validTypes.length === 0) {
		throw serverError(400, `No valid resource types provided for pruning. Allowed types: ${allowedPruneTypes.join(', ')}`);
	}

	console.log(`API: POST /api/system/prune - Pruning types: ${validTypes.join(', ')}`);

	try {
		const results = await pruneSystem(validTypes); // Pass validated types to service

		// Calculate total space reclaimed and check for errors
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
			// Decide if partial success should still return 200 or a different status
			console.warn('Prune completed with errors:', errorMessages);
			// Return 207 Multi-Status might be appropriate, but 200 with error details is often simpler
			return json({ success: false, results, spaceReclaimed: totalSpaceReclaimed, message }, { status: 200 }); // Indicate partial failure in payload
		}

		console.log('API: System prune completed successfully.');
		return json({ success: true, results, spaceReclaimed: totalSpaceReclaimed, message });
	} catch (err: any) {
		console.error('API Error (pruneSystem):', err);
		// Handle errors from pruneSystem setup or unexpected issues
		throw serverError(err.status || 500, err.body?.message || err.message || 'Failed to prune system.');
	}
};
