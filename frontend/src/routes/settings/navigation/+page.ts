import type { PageLoad } from './$types';
import { settingsService } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	const settings = await settingsService.getSettings();

	return {
		settings
	};
};
