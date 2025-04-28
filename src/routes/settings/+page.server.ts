import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getSettings, saveSettings } from '$lib/services/settings-service';
import type { SettingsData } from '$lib/types/settings';

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await getSettings();

	const csrf = crypto.randomUUID();

	return {
		settings,
		csrf
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		let formData = new FormData();
		try {
			formData = await request.formData();
			const settings = await getSettings();

			// Get all form values
			const dockerHost = formData.get('dockerHost') as string;

			// Explicitly check for the "on" value for both toggle switches
			const autoUpdate = formData.get('autoUpdate') === 'on';
			const autoUpdateInterval = Number.parseInt(formData.get('autoUpdateInterval') as string, 10) || 60;

			// Validate interval range
			const validatedAutoUpdateInterval = Math.min(Math.max(autoUpdateInterval, 5), 1440);

			const pollingEnabled = formData.get('pollingEnabled') === 'on';

			const pollingIntervalStr = formData.get('pollingInterval') as string;
			const stacksDirectory = (formData.get('stacksDirectory') as string) || '';

			// --- Read pruneMode from form data ---
			const pruneModeValue = formData.get('pruneMode');
			// Validate the value, default to current setting or 'all' if invalid/missing
			const pruneMode: 'all' | 'dangling' = pruneModeValue === 'all' || pruneModeValue === 'dangling' ? pruneModeValue : settings.pruneMode || 'all'; // Fallback to current or default

			if (!dockerHost) {
				return fail(400, {
					error: 'Docker host cannot be empty.',
					values: Object.fromEntries(formData)
				});
			}

			if (!stacksDirectory) {
				return fail(400, {
					error: 'Stacks directory cannot be empty.',
					values: Object.fromEntries(formData)
				});
			}

			// Process polling interval only if polling is enabled
			let pollingInterval = settings.pollingInterval || 10;
			if (pollingEnabled) {
				const parsedInterval = parseInt(pollingIntervalStr, 10);
				if (!isNaN(parsedInterval) && parsedInterval >= 5 && parsedInterval <= 60) {
					pollingInterval = parsedInterval;
				} else if (pollingIntervalStr) {
					// Only show error if the user actually entered a value
					return fail(400, {
						error: 'Polling interval must be between 5 and 60 minutes.',
						values: {
							...Object.fromEntries(formData),
							pollingEnabled: 'on', // Make sure we retain the enabled state
							autoUpdate: formData.get('autoUpdate') // Preserve autoUpdate state as well
						}
					});
				}
			}

			// Extract Valkey settings
			const valkeyEnabled = formData.get('valkeyEnabled') === 'on';
			const externalServices = {
				...settings.externalServices,
				valkey: {
					enabled: valkeyEnabled,
					host: formData.get('valkeyHost')?.toString() || 'localhost',
					port: parseInt(formData.get('valkeyPort')?.toString() || '6379', 10),
					username: formData.get('valkeyUsername')?.toString() || '',
					password: formData.get('valkeyPassword')?.toString() || '',
					keyPrefix: formData.get('valkeyKeyPrefix')?.toString() || 'arcane:settings:'
				}
			};

			const updatedSettings: SettingsData = {
				...settings,
				dockerHost,
				autoUpdate,
				pollingEnabled,
				pollingInterval,
				autoUpdateInterval: validatedAutoUpdateInterval,
				stacksDirectory,
				pruneMode: pruneMode,
				externalServices
			};

			// Save updated settings
			await saveSettings(updatedSettings);

			return { success: true };
		} catch (error: any) {
			console.error('Error updating settings:', error);
			const formValues = Object.fromEntries(formData);
			return fail(500, {
				error: error.message || 'Failed to save settings.',
				values: formValues
			});
		}
	}
};
