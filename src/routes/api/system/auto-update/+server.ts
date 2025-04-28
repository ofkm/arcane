import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSettings } from '$lib/services/settings-service';
import { checkAndUpdateContainers, checkAndUpdateStacks } from '$lib/services/docker/auto-update-service';

export const GET: RequestHandler = async () => {
	try {
		const settings = await getSettings();

		return json({
			enabled: settings.autoUpdate,
			interval: settings.autoUpdateInterval || 60,
			message: settings.autoUpdate ? `Auto-update is enabled and checks every ${settings.autoUpdateInterval || 60} minutes` : 'Auto-update is disabled'
		});
	} catch (error: any) {
		console.error('Error getting auto-update status:', error);
		return json(
			{
				error: error.message || 'Failed to get auto-update status',
				enabled: false
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async () => {
	try {
		const [containerResults, stackResults] = await Promise.all([checkAndUpdateContainers(), checkAndUpdateStacks()]);

		return json({
			success: true,
			containers: containerResults,
			stacks: stackResults
		});
	} catch (error: any) {
		console.error('Error running manual update check:', error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to run update check'
			},
			{ status: 500 }
		);
	}
};
