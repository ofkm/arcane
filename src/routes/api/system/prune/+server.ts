import { json, error as serverError } from '@sveltejs/kit';
import { pruneSystem } from '$lib/services/docker/system-service'; // Use the correct service
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	console.log('API: POST /api/docker/system/prune');
	try {
		const results = await pruneSystem();
		// You might want to format the results for a better message
		console.log('API: System prune completed.');
		// Aggregate space reclaimed if needed
		let totalSpaceReclaimed = 0;
		if (Array.isArray(results)) {
			results.forEach((res) => {
				if (res && typeof res.SpaceReclaimed === 'number') {
					totalSpaceReclaimed += res.SpaceReclaimed;
				}
			});
		}
		return json({ success: true, results, spaceReclaimed: totalSpaceReclaimed, message: 'System prune completed successfully.' });
	} catch (err: any) {
		console.error('API Error (pruneSystem):', err);
		throw serverError(500, err.message || 'Failed to prune system.');
	}
};
