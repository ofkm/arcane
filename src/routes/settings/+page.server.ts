import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getSettings, saveSettings } from '$lib/services/settings-service';
import type { SettingsData } from '$lib/types/settings';
import { listUsers, saveUser, getUserById, hashPassword } from '$lib/services/user-service';

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await getSettings();
	const users = await listUsers();

	const csrf = crypto.randomUUID();

	// Remove sensitive data before sending to client
	const sanitizedUsers = users.map((user) => {
		const { passwordHash, mfaSecret, ...rest } = user;
		return rest;
	});

	return {
		settings,
		csrf,
		users: sanitizedUsers
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		let formData = new FormData();
		try {
			formData = await request.formData();
			// Get current settings primarily to access fields NOT editable in this form (like registryCredentials)
			// and for default values if form fields are missing.
			const currentSettings = await getSettings();

			// --- Get values from form ---
			const dockerHost = formData.get('dockerHost') as string;
			const autoUpdate = formData.get('autoUpdate') === 'on';
			const autoUpdateIntervalStr = formData.get('autoUpdateInterval') as string;
			const pollingEnabled = formData.get('pollingEnabled') === 'on';
			const pollingIntervalStr = formData.get('pollingInterval') as string;
			const stacksDirectory = (formData.get('stacksDirectory') as string) || '';
			const pruneMode = formData.get('pruneMode')?.toString() as 'all' | 'dangling' | undefined;
			const localAuthEnabled = formData.get('localAuthEnabled') === 'on';
			const sessionTimeoutStr = formData.get('sessionTimeout')?.toString();
			const passwordPolicy = (formData.get('passwordPolicy') as 'low' | 'medium' | 'high') || 'medium';
			const rbacEnabled = formData.get('rbacEnabled') === 'on';

			// --- Validation ---
			if (!dockerHost) {
				return fail(400, { error: 'Docker host cannot be empty.', values: Object.fromEntries(formData) });
			}
			if (!stacksDirectory) {
				return fail(400, { error: 'Stacks directory cannot be empty.', values: Object.fromEntries(formData) });
			}

			const autoUpdateInterval = Number.parseInt(autoUpdateIntervalStr, 10) || currentSettings.autoUpdateInterval || 60;
			const validatedAutoUpdateInterval = Math.min(Math.max(autoUpdateInterval, 5), 1440);

			let pollingInterval = currentSettings.pollingInterval || 10;
			if (pollingEnabled) {
				const parsedInterval = parseInt(pollingIntervalStr, 10);
				if (!isNaN(parsedInterval) && parsedInterval >= 5 && parsedInterval <= 60) {
					pollingInterval = parsedInterval;
				} else if (pollingIntervalStr) {
					return fail(400, { error: 'Polling interval must be between 5 and 60 minutes.', values: Object.fromEntries(formData) });
				}
			}

			const sessionTimeout = sessionTimeoutStr ? parseInt(sessionTimeoutStr, 10) : currentSettings.auth?.sessionTimeout || 60;

			// --- Construct the settings object explicitly ---
			const updatedSettings: SettingsData = {
				// Fields from the form
				dockerHost,
				autoUpdate,
				autoUpdateInterval: validatedAutoUpdateInterval,
				pollingEnabled,
				pollingInterval,
				stacksDirectory,
				pruneMode: pruneMode || currentSettings.pruneMode || 'all', // Use current or default if not set

				// Explicitly define nested objects with only current fields
				externalServices: {
					// No valkey here
				},
				auth: {
					localAuthEnabled,
					sessionTimeout,
					passwordPolicy,
					rbacEnabled
					// No oidcEnabled here
				},

				// Include fields NOT managed by this form, preserving their current value
				registryCredentials: currentSettings.registryCredentials || []
			};

			// Save the explicitly constructed settings
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
