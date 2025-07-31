import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	const settings = await settingsAPI.getSettings();

	if (settings.onboardingCompleted) {
		throw redirect(302, '/dashboard');
	}

	return { settings };
};
