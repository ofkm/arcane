import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, saveSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler, stopAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async () => {
	const result = await tryCatch(getSettings());
	if (result.error) {
		console.error('API Error fetching settings:', result.error);
		const response: ApiErrorResponse = {
			success: false,
			error: result.error.message || 'Failed to fetch settings',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}
	return json({ success: true, settings: result.data });
};

export const PUT: RequestHandler = async ({ request }) => {
	const bodyResult = await tryCatch(request.json());
	if (bodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const body = bodyResult.data;

	const currentSettingsResult = await tryCatch(getSettings());
	if (currentSettingsResult.error) {
		console.error('API Error fetching current settings:', currentSettingsResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: currentSettingsResult.error.message || 'Failed to fetch current settings',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: currentSettingsResult.error
		};
		return json(response, { status: 500 });
	}
	const currentSettings = currentSettingsResult.data;

	// Validate required fields
	if (!body.dockerHost) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Docker host cannot be empty.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	if (!body.stacksDirectory) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stacks directory cannot be empty.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Normalize boolean values (handle string representation from form data)
	const booleanFields = ['autoUpdate', 'pollingEnabled'];
	const nestedAuthBooleanFields = ['localAuthEnabled', 'rbacEnabled'];
	booleanFields.forEach((field) => {
		if (field in body && typeof body[field] === 'string') {
			body[field] = body[field] === 'true';
		}
	});
	if (body.auth) {
		nestedAuthBooleanFields.forEach((field) => {
			if (field in body.auth && typeof body.auth[field] === 'string') {
				body.auth[field] = body.auth[field] === 'true';
			}
		});
	}

	// Validate polling interval if polling is enabled
	if (body.pollingEnabled) {
		const pollingInterval = parseInt(body.pollingInterval, 10);
		if (isNaN(pollingInterval) || pollingInterval < 5 || pollingInterval > 60) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'Polling interval must be between 5 and 60 minutes.',
				code: ApiErrorCode.BAD_REQUEST
			};
			return json(response, { status: 400 });
		}
		body.pollingInterval = pollingInterval;
	}

	// Validate auto-update interval if enabled
	if (body.autoUpdate) {
		const autoUpdateInterval = parseInt(body.autoUpdateInterval, 10);
		if (isNaN(autoUpdateInterval) || autoUpdateInterval < 5) {
			body.autoUpdateInterval = 60;
		} else {
			const validatedAutoUpdateInterval = Math.min(Math.max(autoUpdateInterval, 5), 1440);
			body.autoUpdateInterval = validatedAutoUpdateInterval;
		}
	}

	// Ensure nested objects exist if they are partially updated
	if (!body.externalServices) body.externalServices = {};
	if (!body.auth) body.auth = {};

	// Handle registry credentials
	if (body.registryCredentials && typeof body.registryCredentials === 'string') {
		try {
			body.registryCredentials = JSON.parse(body.registryCredentials);
		} catch (e) {
			console.error('Error parsing registry credentials', e);
			body.registryCredentials = currentSettings.registryCredentials;
		}
	}

	// Handle authentication settings
	if (body.authentication && typeof body.authentication === 'string') {
		try {
			body.authentication = JSON.parse(body.authentication);
		} catch (e) {
			console.error('Error parsing authentication settings', e);
			body.authentication = currentSettings.auth;
		}
	}

	// Handle Auth settings
	if (body.auth !== undefined) {
		body.auth = {
			localAuthEnabled: body.auth.localAuthEnabled ?? currentSettings.auth?.localAuthEnabled ?? true,
			sessionTimeout: body.auth.sessionTimeout ?? currentSettings.auth?.sessionTimeout ?? 60,
			passwordPolicy: body.auth.passwordPolicy ?? currentSettings.auth?.passwordPolicy ?? 'strong'
		};
	} else if (currentSettings.auth) {
		body.auth = currentSettings.auth;
	}

	// Add onboarding to accepted fields
	if (body.onboarding) {
		if (typeof body.onboarding.completed === 'string') {
			body.onboarding.completed = body.onboarding.completed === 'true';
		}
		if (!body.onboarding.completedAt) {
			body.onboarding.completedAt = new Date().toISOString();
		}
	}

	// Merge settings
	const updatedSettings: Settings = {
		...currentSettings,
		...body
	};
	if (body.pruneMode) {
		updatedSettings.pruneMode = body.pruneMode as 'all' | 'dangling';
	}

	// Save updated settings
	const saveResult = await tryCatch(saveSettings(updatedSettings));
	if (saveResult.error) {
		console.error('API Error saving settings:', saveResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: saveResult.error.message || 'Failed to save settings',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: saveResult.error
		};
		return json(response, { status: 500 });
	}

	// Handle Docker connection changes
	const dockerHostChanged = currentSettings.dockerHost !== updatedSettings.dockerHost;
	const stacksDirChanged = currentSettings.stacksDirectory !== updatedSettings.stacksDirectory;
	if (dockerHostChanged || stacksDirChanged) {
		const initResult = await tryCatch(initComposeService());
		if (initResult.error) {
			console.error('API Error initializing compose service:', initResult.error);
			// Not returning error since settings were saved successfully
		}
	}

	// Handle auto-update changes
	const autoUpdateChanged = currentSettings.autoUpdate !== updatedSettings.autoUpdate || currentSettings.autoUpdateInterval !== updatedSettings.autoUpdateInterval;
	if (autoUpdateChanged) {
		if (updatedSettings.autoUpdate) {
			await tryCatch(stopAutoUpdateScheduler());
			const schedulerResult = await tryCatch(initAutoUpdateScheduler());
			if (schedulerResult.error) {
				console.error('API Error initializing auto-update scheduler:', schedulerResult.error);
			}
		} else {
			await tryCatch(stopAutoUpdateScheduler());
		}
	}

	return json({
		success: true,
		message: 'Settings updated successfully',
		settings: updatedSettings
	});
};
