import type { PageLoad } from './$types';
import { environmentAPI } from '$lib/services/api';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const containerId = params.containerId;

	try {
		const container = await environmentAPI.getContainer(containerId);
		const containerStats = await environmentAPI.getContainerStats(containerId);

		if (!container) {
			throw error(404, 'Container not found');
		}

		return {
			container,
			stats: containerStats
		};
	} catch (err: any) {
		console.error('Failed to load container:', err);
		if (err.status === 404) {
			throw err;
		}
		throw error(500, err.message || 'Failed to load container details');
	}
};
