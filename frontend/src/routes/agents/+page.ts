import type { PageLoad } from './$types';
import { agentAPI, sessionAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async () => {
	try {
		// Check authentication and authorization via API
		const session = await sessionAPI.getCurrentSession();

		if (!session) {
			throw error(401, {
				message: 'Authentication required'
			});
		}

		// Check if user has admin role
		if (!session.user?.roles?.includes('admin')) {
			throw error(403, {
				message: 'Unauthorized access'
			});
		}

		// Load agents with status from API
		const agents = await agentAPI.listWithStatus();

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
