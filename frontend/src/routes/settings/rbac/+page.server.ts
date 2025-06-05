import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();

	return {
		settings
	};
};
