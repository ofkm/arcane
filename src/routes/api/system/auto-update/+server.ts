import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSettings } from '$lib/services/settings-service';
import { checkAndUpdateContainers, checkAndUpdateStacks } from '$lib/services/docker/auto-update-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async () => {
	const settingsResult = await tryCatch(getSettings());

	if (settingsResult.error) {
		console.error('Error getting auto-update status:', settingsResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: settingsResult.error.message || 'Failed to get auto-update status',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: settingsResult.error
		};
		return json(response, { status: 500 });
	}

	const settings = settingsResult.data;
	return json({
		success: true,
		enabled: settings.autoUpdate,
		interval: settings.autoUpdateInterval || 60,
		message: settings.autoUpdate ? `Auto-update is enabled and checks every ${settings.autoUpdateInterval || 60} minutes` : 'Auto-update is disabled'
	});
};

export const POST: RequestHandler = async () => {
	const containerResult = await tryCatch(checkAndUpdateContainers());
	const stackResult = await tryCatch(checkAndUpdateStacks());

	if (containerResult.error || stackResult.error) {
		console.error('Error running manual update check:', containerResult.error || stackResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: containerResult.error?.message || stackResult.error?.message || 'Failed to run update check',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: containerResult.error || stackResult.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		containers: containerResult.data,
		stacks: stackResult.data
	});
};
