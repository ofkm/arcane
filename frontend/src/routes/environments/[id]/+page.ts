import type { PageLoad } from './$types';
import { environmentManagementAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	try {
		const environment = await environmentManagementAPI.get(params.id);

		return {
			environment
		};
	} catch (err) {
		console.error('Failed to load environment:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(404, {
			message: err instanceof Error ? err.message : 'Environment not found'
		});
	}
};
