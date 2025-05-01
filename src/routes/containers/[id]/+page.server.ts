import type { PageServerLoad, Actions } from './$types';
import { getContainer, startContainer, stopContainer, restartContainer, removeContainer, getContainerLogs, getContainerStats } from '$lib/services/docker/container-service';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const containerId = params.id;

	try {
		// Fetch container, logs, and stats in parallel
		const [container, logs, stats] = await Promise.all([
			getContainer(containerId),
			getContainerLogs(containerId, { tail: 100 }).catch((err) => {
				console.error(`Failed to retrieve logs for ${containerId}:`, err);
				return 'Failed to load logs. Container might not be running or logs are unavailable.'; // Updated message
			}),
			getContainerStats(containerId).catch((err) => {
				// Fetch stats
				console.error(`Failed to retrieve stats for ${containerId}:`, err);
				// Don't fail the page load for stats errors, just return null
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
		// If the error is NotFoundError from getContainerStats, it should have been caught above.
		// This handles errors from getContainer primarily.
		if (err.name === 'NotFoundError') {
			error(404, { message: err.message });
		} else {
			error(500, {
				message: err.message || `Failed to load container details for "${containerId}".`
			});
		}
	}
};

// Actions remain the same
export const actions: Actions = {
	start: async ({ params }) => {
		const containerId = params.id;
		try {
			await startContainer(containerId);
			return { success: true, message: 'Container started.' };
		} catch (err: any) {
			return fail(500, { error: err.message });
		}
	},
	stop: async ({ params }) => {
		const containerId = params.id;
		try {
			await stopContainer(containerId);
			return { success: true, message: 'Container stopped.' };
		} catch (err: any) {
			return fail(500, { error: err.message });
		}
	},
	restart: async ({ params }) => {
		const containerId = params.id;
		try {
			await restartContainer(containerId);
			return { success: true, message: 'Container restarted.' };
		} catch (err: any) {
			return fail(500, { error: err.message });
		}
	},
	remove: async ({ params, url }) => {
		// Read 'force' from URL
		const containerId = params.id;
		const force = url.searchParams.get('force') === 'true'; // Get force param
		try {
			await removeContainer(containerId, force); // Pass force param
			redirect(303, '/containers');
		} catch (err: any) {
			// Handle specific errors from removeContainer
			if (err.name === 'NotFoundError' || err.name === 'ConflictError' || err.name === 'DockerApiError') {
				return fail(err.status || 500, { error: err.message });
			}
			// Fallback for unexpected errors
			return fail(500, { error: err.message || 'An unexpected error occurred during removal.' });
		}
	}
};
