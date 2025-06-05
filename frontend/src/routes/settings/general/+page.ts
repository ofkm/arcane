import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();

		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load general settings:', error);
		return {
			settings: {
				theme: 'dark',
				language: 'en',
				timezone: 'UTC',
				enableNotifications: true,
				autoRefresh: true,
				refreshInterval: 30
			}
		};
	}
};
