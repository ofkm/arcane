import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, saveSettings } from '$lib/services/settings-service';
import type { Settings } from '$lib/types/settings.type';
import { initComposeService } from '$lib/services/docker/stack-service';
import { initAutoUpdateScheduler, stopAutoUpdateScheduler } from '$lib/services/docker/scheduler-service';

export const GET: RequestHandler = async () => {
	try {
		const settings = await getSettings();
		return json({ success: true, settings });
	} catch (error: any) {
		console.error('API Error fetching settings:', error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to fetch settings'
			},
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const currentSettings = await getSettings();

		// Validate required fields
		if (!body.dockerHost) {
			return json(
				{
					success: false,
					error: 'Docker host cannot be empty.'
				},
				{ status: 400 }
			);
		}

		if (!body.stacksDirectory) {
			return json(
				{
					success: false,
					error: 'Stacks directory cannot be empty.'
				},
				{ status: 400 }
			);
		}

		// Normalize boolean values (handle string representation from form data)
		const booleanFields = ['autoUpdate', 'pollingEnabled'];
		const nestedAuthBooleanFields = ['localAuthEnabled', 'rbacEnabled'];

		// Handle top-level boolean fields
		booleanFields.forEach((field) => {
			if (field in body) {
				// Convert string "true"/"false" to actual boolean if needed
				if (typeof body[field] === 'string') {
					body[field] = body[field] === 'true';
				}
			}
		});

		// Handle nested auth boolean fields
		if (body.auth) {
			nestedAuthBooleanFields.forEach((field) => {
				if (field in body.auth) {
					// Convert string "true"/"false" to actual boolean if needed
					if (typeof body.auth[field] === 'string') {
						body.auth[field] = body.auth[field] === 'true';
					}
				}
			});
		}

		// Validate polling interval if polling is enabled
		if (body.pollingEnabled) {
			const pollingInterval = parseInt(body.pollingInterval, 10);
			if (isNaN(pollingInterval) || pollingInterval < 5 || pollingInterval > 60) {
				return json(
					{
						success: false,
						error: 'Polling interval must be between 5 and 60 minutes.'
					},
					{ status: 400 }
				);
			}
			body.pollingInterval = pollingInterval; // Ensure it's a number
		}

		// Validate auto-update interval if enabled
		if (body.autoUpdate) {
			const autoUpdateInterval = parseInt(body.autoUpdateInterval, 10);
			if (isNaN(autoUpdateInterval) || autoUpdateInterval < 5) {
				body.autoUpdateInterval = 60; // Default to 60 minutes
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
				// Use current registry credentials
				body.registryCredentials = currentSettings.registryCredentials;
			}
		}

		// Handle authentication settings
		if (body.authentication && typeof body.authentication === 'string') {
			try {
				body.authentication = JSON.parse(body.authentication);
			} catch (e) {
				console.error('Error parsing authentication settings', e);
				// Use current authentication settings
				body.authentication = currentSettings.auth;
			}
		}

		// Handle Auth settings
		if (body.auth !== undefined) {
			body.auth = {
				localAuthEnabled: body.auth.localAuthEnabled ?? currentSettings.auth?.localAuthEnabled ?? true,
				sessionTimeout: body.auth.sessionTimeout ?? currentSettings.auth?.sessionTimeout ?? 60
			};
		} else if (currentSettings.auth) {
			// Keep current auth settings if not provided in update
			body.auth = currentSettings.auth;
		}

		// Add onboarding to accepted fields
		// Validate and normalize onboarding status
		if (body.onboarding) {
			if (typeof body.onboarding.completed === 'string') {
				body.onboarding.completed = body.onboarding.completed === 'true';
			}

			// Ensure completedAt is a valid date string
			if (!body.onboarding.completedAt) {
				body.onboarding.completedAt = new Date().toISOString();
			}
		}

		// Merge settings
		const updatedSettings: Settings = {
			...currentSettings,
			...body
		};

		// Handle special cases for pruning settings
		if (body.pruneMode) {
			updatedSettings.pruneMode = body.pruneMode as 'all' | 'dangling';
		}

		// Save updated settings
		await saveSettings(updatedSettings);

		// Handle Docker connection changes
		const dockerHostChanged = currentSettings.dockerHost !== updatedSettings.dockerHost;
		const stacksDirChanged = currentSettings.stacksDirectory !== updatedSettings.stacksDirectory;

		if (dockerHostChanged || stacksDirChanged) {
			// Reinitialize compose service with new settings
			await initComposeService();
		}

		// Handle auto-update changes
		const autoUpdateChanged = currentSettings.autoUpdate !== updatedSettings.autoUpdate || currentSettings.autoUpdateInterval !== updatedSettings.autoUpdateInterval;

		if (autoUpdateChanged) {
			if (updatedSettings.autoUpdate) {
				// Stop any existing scheduler and start with new settings
				await stopAutoUpdateScheduler();
				await initAutoUpdateScheduler();
			} else {
				// Stop the auto-update scheduler if disabled
				await stopAutoUpdateScheduler();
			}
		}

		return json({
			success: true,
			message: 'Settings updated successfully',
			settings: updatedSettings
		});
	} catch (error: any) {
		console.error('API Error updating settings:', error);
		return json(
			{
				success: false,
				error: error.message || 'Failed to update settings'
			},
			{ status: 500 }
		);
	}
};
