import { redirect } from '@sveltejs/kit';
import { getSettings } from '$lib/services/settings-service';

export async function load() {
	const settings = await getSettings();

	if (settings.onboarding?.completed) {
		throw redirect(302, '/dashboard');
	}

	return { settings };
}
