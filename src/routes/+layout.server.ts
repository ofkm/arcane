import { version as currentVersion } from '$app/environment';
import { env } from '$env/dynamic/private';
import AppConfigService from '$lib/services/app-config-service';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import type { LayoutServerLoad } from './$types';

let versionInformation: AppVersionInformation;
let versionInformationLastUpdated: number;

export const load = (async (locals) => {
	// If update checks are disabled via env var, return only current version
	const updateCheckDisabled = env.UPDATE_CHECK_DISABLED === 'true';

	if (updateCheckDisabled) {
		return {
			versionInformation: {
				currentVersion
			} as AppVersionInformation,
			user: locals.locals.user || null
		};
	}

	const appConfigService = new AppConfigService();

	// Cache the version information for 3 hours
	const cacheExpired = versionInformationLastUpdated && Date.now() - versionInformationLastUpdated > 1000 * 60 * 60 * 3;

	if (!versionInformation || cacheExpired) {
		try {
			versionInformation = await appConfigService.getVersionInformation();
			versionInformationLastUpdated = Date.now();
		} catch (error) {
			console.error('Error fetching version information:', error);
			versionInformation = { currentVersion } as AppVersionInformation;
		}
	}

	return {
		versionInformation,
		user: locals.locals.user || null
	};
}) satisfies LayoutServerLoad;
