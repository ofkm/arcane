import type { PageLoad } from './$types';
import { environmentManagementAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async () => {
	try {
		const environments = await environmentManagementAPI.list();

		return {
			environments
		};
	} catch (err) {
		console.error('Failed to load environments:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, {
			message: err instanceof Error ? err.message : 'Failed to load environments'
		});
	}
};
