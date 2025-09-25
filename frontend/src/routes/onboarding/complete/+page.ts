import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsService } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	const settings = await settingsService.getSettings();

	if (settings.onboardingCompleted) {
		throw redirect(302, '/dashboard');
	}

	return { settings };
};
