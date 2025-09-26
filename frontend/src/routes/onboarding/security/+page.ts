import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { settingsService } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	const [settings, oidcStatus] = await Promise.all([
		settingsService.getSettings(),
		settingsService.getOidcStatus().catch(() => ({
			envForced: false,
			envConfigured: false
		}))
	]);

	if (settings.onboardingCompleted) {
		throw redirect(302, '/dashboard');
	}

	return { settings, oidcStatus };
};
