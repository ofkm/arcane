import { redirect } from '@sveltejs/kit';
import { settingsAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const settings = await settingsAPI.getSettings();

	if (settings.onboarding?.completed) {
		throw redirect(302, '/');
	}

	return { settings };
};
