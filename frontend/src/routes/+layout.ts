import { env } from '$env/dynamic/public';
import { settingsAPI, userAPI, environmentManagementAPI } from '$lib/services/api';
import { environmentStore } from '$lib/stores/environment.store';
import { versionService } from '$lib/services/app-version-service';
import { tryCatch } from '$lib/utils/try-catch';
import userStore from '$lib/stores/user-store';
import settingsStore from '$lib/stores/config-store';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';

export const ssr = false;

export const load = async () => {
	const updateCheckDisabled = env.PUBLIC_UPDATE_CHECK_DISABLED === 'true';

	const userPromise = userAPI.getCurrentUser().catch(() => null);
	const settingsPromise = settingsAPI.getSettings().catch((e) => {
		console.error('Error fetching settings:', e);
		return settingsAPI.getPublicSettings().catch(() => null);
	});

	const environmentRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 1000
		}
	};

	const environmentsPromise = userPromise.then(async (user) => {
		if (!environmentStore.isInitialized() && user) {
			const environments = await tryCatch(environmentManagementAPI.getEnvironments(environmentRequestOptions));
			if (!environments.error) {
				await environmentStore.initialize(environments.data.data, true);
			}
		}
		return null;
	});

	const versionPromise = updateCheckDisabled
		? Promise.resolve({ currentVersion: versionService.getCurrentVersion() })
		: versionService.getVersionInformation();

	const [user, settings, , versionInformation] = await Promise.all([
		userPromise,
		settingsPromise,
		environmentsPromise,
		versionPromise
	]);

	if (user) {
		await userStore.setUser(user);
	}

	if (settings) {
		settingsStore.set(settings);
	}

	return {
		user,
		settings,
		versionInformation,
		updateCheckDisabled
	};
};
