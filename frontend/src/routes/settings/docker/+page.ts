import type { PageLoad } from './$types';
import { settingsAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	const settings = await settingsAPI.getSettings();
	console.log(settings);

	return {
		settings
	};
};
