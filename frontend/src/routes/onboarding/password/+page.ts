import { redirect } from '@sveltejs/kit';
import { settingsAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();

		if (settings.onboarding?.steps?.password) {
			throw redirect(302, '/onboarding/settings');
		}

		return { settings };
	} catch (err) {
		console.error('Failed to load settings:', err);
		// If settings can't be loaded, continue to password setup
		return {
			settings: {
				onboarding: {
					steps: {
						password: false
					}
				}
			}
		};
	}
};
