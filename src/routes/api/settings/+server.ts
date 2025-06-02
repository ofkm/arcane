import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings as getPersistedSettings, saveSettings as persistSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';
import { initComposeService } from '$lib/services/docker/stack-custom-service';
import { initAutoUpdateScheduler, stopAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { updateSettingsStore } from '$lib/stores/settings-store'; // To update server-side store instance
import {
	updateDockerConnection,
	dockerHost as currentCoreDockerHost // Import the current host from core.ts
} from '$lib/services/docker/core';

export const GET: RequestHandler = async () => {
	const result = await tryCatch(getPersistedSettings());
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
	const newSettingsData = bodyResult.data as Settings; // Renamed for clarity

	// Validate required fields (using newSettingsData)
	if (!newSettingsData.dockerHost) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Docker host cannot be empty.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	if (!newSettingsData.stacksDirectory) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Stacks directory cannot be empty.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Normalize boolean values.
	// Ensure that the keys listed in booleanFields correspond to properties in Settings
	// that are intended to be booleans (e.g., defined as `boolean` or `boolean | undefined`).
	const booleanFields: Array<keyof Settings> = ['autoUpdate', 'pollingEnabled'];
	booleanFields.forEach((field) => {
		const currentValue = newSettingsData[field];
		if (typeof currentValue === 'string') {
			// If currentValue is a string, convert it to boolean and assign back.
			// Using `as Record<string, any>` for the assignment target can help if TypeScript
			// has issues with the specific indexed assignment `newSettingsData[field] = boolean_value;`
			(newSettingsData as Record<string, any>)[field] = currentValue.toLowerCase() === 'true';
		}
	});

	// Normalize boolean values for nested auth settings.
	// Ensure keys in nestedAuthBooleanFields correspond to boolean properties in Settings['auth'].
	if (newSettingsData.auth) {
		// Define keys more safely based on the actual type of newSettingsData.auth
		const nestedAuthBooleanFields: Array<keyof typeof newSettingsData.auth> = ['localAuthEnabled', 'rbacEnabled'];
		nestedAuthBooleanFields.forEach((field) => {
			// Ensure the field is a key of newSettingsData.auth before accessing
			if (Object.prototype.hasOwnProperty.call(newSettingsData.auth, field)) {
				const currentValue = newSettingsData.auth[field];
				if (typeof currentValue === 'string') {
					(newSettingsData.auth as Record<string, any>)[field] = currentValue.toLowerCase() === 'true';
				}
			}
		});
	}

	// Validate polling interval if polling is enabled
	if (newSettingsData.pollingEnabled) {
		const pollingInterval = parseInt(String(newSettingsData.pollingInterval), 10);
		if (isNaN(pollingInterval) || pollingInterval < 5 || pollingInterval > 60) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'Polling interval must be between 5 and 60 minutes.',
				code: ApiErrorCode.BAD_REQUEST
			};
			return json(response, { status: 400 });
		}
		newSettingsData.pollingInterval = pollingInterval;
	}

	// Validate auto-update interval if enabled
	if (newSettingsData.autoUpdate) {
		const autoUpdateInterval = parseInt(String(newSettingsData.autoUpdateInterval), 10);
		if (isNaN(autoUpdateInterval) || autoUpdateInterval < 5) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'Auto-update interval must be at least 5 minutes.',
				code: ApiErrorCode.BAD_REQUEST
			};
			return json(response, { status: 400 });
		}
		newSettingsData.autoUpdateInterval = autoUpdateInterval;
	}

	// Validate maturity threshold days
	const maturityThresholdDays = parseInt(String(newSettingsData.maturityThresholdDays), 10);
	if (isNaN(maturityThresholdDays) || maturityThresholdDays < 1 || maturityThresholdDays > 365) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Maturity threshold must be between 1 and 365 days.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	newSettingsData.maturityThresholdDays = maturityThresholdDays;

	// Persist the validated new settings to disk
	const saveResult = await tryCatch(persistSettings(newSettingsData));

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

	console.log('API: Settings saved to disk successfully.');

	// Update the server-side in-memory Svelte store instance.
	updateSettingsStore(newSettingsData);
	console.log('API: Server-side settingsStore updated.');

	// Check if Docker host changed and update Docker connection in core.ts if needed
	const newDockerHost = newSettingsData.dockerHost;
	if (newDockerHost && newDockerHost !== currentCoreDockerHost) {
		console.log(`API: Docker host changed from "${currentCoreDockerHost}" to "${newDockerHost}". Updating Docker connection.`);
		updateDockerConnection(newDockerHost);
	} else if (newDockerHost) {
		console.log(`API: Docker host "${newDockerHost}" is the same as current "${currentCoreDockerHost}". No Docker connection update forced from API.`);
	}

	// Re-initialize services that depend on settings
	await tryCatch(initComposeService());
	await tryCatch(stopAutoUpdateScheduler());
	if (newSettingsData.autoUpdate) {
		await tryCatch(initAutoUpdateScheduler());
	}

	return json({ success: true, message: 'Settings updated successfully' });
};
