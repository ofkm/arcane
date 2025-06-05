import type { PageServerLoad } from './$types';
import { getContainer, getContainerLogs, getContainerStats } from '$lib/services/docker/container-service';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const containerId = params.id;

	try {
		const [container, logs, stats] = await Promise.all([
			getContainer(containerId),
			getContainerLogs(containerId, { tail: 100 }).catch((err) => {
				console.error(`Failed to retrieve logs for ${containerId}:`, err);
				return 'Failed to load logs. Container might not be running or logs are unavailable.';
			}),
			getContainerStats(containerId).catch((err) => {
				console.error(`Failed to retrieve stats for ${containerId}:`, err);
				return null;
			})
		]);

		if (!container) {
			error(404, {
				message: `Container with ID "${containerId}" not found.`
			});
		}

		return {
			container,
			logs,
			stats
		};
	} catch (err: any) {
		console.error(`Failed to load container ${containerId}:`, err);
		if (err.name === 'NotFoundError') {
			error(404, { message: err.message });
		} else {
			error(500, {
				message: err.message || `Failed to load container details for "${containerId}".`
			});
		}
	}
};
