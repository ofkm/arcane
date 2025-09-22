import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const settings = await settingsAPI.getSettings();
		
		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load navigation settings:', error);
		redirect(303, '/auth/login');
	}
};
