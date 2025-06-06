import { settingsAPI } from '$lib/services/api';

export const load = async () => {
	const settings = await settingsAPI.getSettings();

	return {
		settings
	};
};
