import { environmentManagementService } from '$lib/services/env-mgmt-service';
import { settingsService } from '$lib/services/settings-service';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const environment = await environmentManagementService.get(params.id);

		const settings = await settingsService.getSettingsForEnvironment(params.id);

		return {
			environment,
			settings
		};
	} catch (error) {
		console.error('Failed to load environment:', error);
		throw error;
	}
};
