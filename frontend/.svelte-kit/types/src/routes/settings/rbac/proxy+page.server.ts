// @ts-nocheck
import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load = async () => {
	const settings = await getSettings();

	return {
		settings
	};
};
;null as any as PageServerLoad;