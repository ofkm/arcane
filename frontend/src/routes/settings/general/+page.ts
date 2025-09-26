import { settingsService } from '$lib/services/settings-service';

export const load = async () => {
	const settings = await settingsService.getSettings();

	return {
		settings
	};
};
