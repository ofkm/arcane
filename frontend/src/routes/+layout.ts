import { environmentStore } from '$lib/stores/environment.store';
import versionService from '$lib/services/version-service';
import { tryCatch } from '$lib/utils/try-catch';
import userStore from '$lib/stores/user-store';
import settingsStore from '$lib/stores/config-store';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import { userService } from '$lib/services/user-service';
import { settingsService } from '$lib/services/settings-service';
import { environmentManagementService } from '$lib/services/env-mgmt-service';

export const ssr = false;

export const load = async () => {
	if (!environmentStore.isInitialized()) {
		await environmentStore.initialize([], true);
	}

	const userPromise = userService.getCurrentUser().catch(() => null);
	const settingsPromise = settingsService.getSettings().catch((e) => {
		console.error('Error fetching settings:', e);
		return settingsService.getPublicSettings().catch(() => null);
	});

	const environmentRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 1000
		}
	};

	const environmentsPromise = userPromise.then(async (user) => {
		if (user) {
			const environments = await tryCatch(environmentManagementService.getEnvironments(environmentRequestOptions));
			if (!environments.error) {
				await environmentStore.initialize(environments.data.data, true);
			}
		}
		return null;
	});

	let versionInformation: AppVersionInformation = {
		currentVersion: versionService.getCurrentVersion()
	};

	try {
		const info = await versionService.getVersionInformation();
		versionInformation = {
			currentVersion: info.currentVersion,
			newestVersion: info.newestVersion,
			updateAvailable: info.newestVersion ? info.newestVersion !== info.currentVersion : false,
			releaseUrl: info.releaseUrl
		};
	} catch {}

	const [user, settings] = await Promise.all([userPromise, settingsPromise, environmentsPromise]);

	if (user) {
		await userStore.setUser(user);
	}

	if (settings) {
		settingsStore.set(settings);
	}

	return {
		user,
		settings,
		versionInformation
	};
};
