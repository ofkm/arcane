import { settingsAPI, userAPI } from '$lib/services/api';

export const load = async () => {
	const users = await userAPI.list();
	const settings = await settingsAPI.getSettings();

	return {
		settings,
		users
	};
};
