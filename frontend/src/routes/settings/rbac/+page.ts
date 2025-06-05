import type { PageLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	const settings = await getSettings();

	return {
		settings
	};
};
