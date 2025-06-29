import { env } from '$env/dynamic/public';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import { settingsAPI, userAPI, environmentManagementAPI } from '$lib/services/api';
import { environmentStore } from '$lib/stores/environment.store';
import { versionService } from '$lib/services/app-version-service';
import { tryCatch } from '$lib/utils/try-catch';

export const ssr = false;

export const load = async ({}) => {
	const updateCheckDisabled = env.PUBLIC_UPDATE_CHECK_DISABLED === 'true';

	let arcaneSettings = await tryCatch(settingsAPI.getSettings());
	if (arcaneSettings.error) {
		console.error('Failed to load all setting settings');
		arcaneSettings = await tryCatch(settingsAPI.getPublicSettings());
	}

	const arcaneUser = await tryCatch(userAPI.getCurrentUser());
	if (arcaneUser.error) {
		console.error('Failed to load user information');
	}

	if (!environmentStore.isInitialized()) {
		const environments = await tryCatch(environmentManagementAPI.list());

		await environmentStore.initialize(environments.data || [], true);
	}

	let versionInformation: AppVersionInformation;
	if (updateCheckDisabled) {
		versionInformation = { currentVersion: versionService.getCurrentVersion() };
	} else {
		versionInformation = await versionService.getVersionInformation();
	}

	return {
		user: arcaneUser.data,
		isAuthenticated: !!arcaneUser.data,
		settings: arcaneSettings.data,
		versionInformation,
		updateCheckDisabled
	};
};
