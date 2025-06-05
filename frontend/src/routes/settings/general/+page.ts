import type { PageLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';

export const load: PageLoad = async () => {
	try {
		const settings = await getSettings();

		return {
			settings
		};
	} catch (error) {
		console.error('Failed to load settings:', error);
		return {
			settings: {
				stacksDirectory: 'data/stacks',
				baseServerUrl: 'localhost',
				maturityThresholdDays: 30
			}
		};
	}
};
