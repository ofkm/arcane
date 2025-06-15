import type { PageLoad } from './$types';
import { agentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async () => {
	try {
		// Load agents with status from API
		const agents = await agentAPI.list();

		return {
			agents
		};
	} catch (err) {
		console.error('Failed to load agents:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, {
			message: err instanceof Error ? err.message : 'Failed to load agents'
		});
	}
};
