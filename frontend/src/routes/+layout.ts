import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import { settingsAPI, userAPI, environmentManagementAPI } from '$lib/services/api';
import { environmentStore } from '$lib/stores/environment.store';

let versionInformation: AppVersionInformation;
let versionInformationLastUpdated: number;

export const load = async ({ fetch, url }) => {
	let csrf: string;
	try {
		csrf = crypto.randomUUID();
	} catch {
		csrf = Math.random().toString(36).substring(2) + Date.now().toString(36);
	}

	const updateCheckDisabled = env.PUBLIC_UPDATE_CHECK_DISABLED === 'true';

	let isAuthenticated = false;
	let user = null;
	let settings: any = null;

	const path = url.pathname;
	const publicPaths = ['/auth/login', '/auth/logout', '/auth/oidc/login', '/auth/oidc/callback', '/img', '/favicon.ico'];
	const isPublicPath = publicPaths.some((p) => path.startsWith(p));

	try {
		settings = await settingsAPI.getSettings();
	} catch (e: any) {
		if (isPublicPath) {
			try {
				const publicSettingsResponse = await fetch('/api/settings/public');
				if (publicSettingsResponse.ok) {
					const publicData = await publicSettingsResponse.json();
					if (publicData.success) settings = publicData.data;
				}
			} catch (publicError) {
				console.warn('Could not fetch public settings:', publicError);
			}
		}
	}

	try {
		user = await userAPI.getCurrentUser();
		if (user) {
			isAuthenticated = true;
		}
	} catch (e: any) {
		user = null;
		isAuthenticated = false;
	}

	if (!isPublicPath && !isAuthenticated) {
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	if (isAuthenticated && !isPublicPath) {
		if (!environmentStore.isInitialized()) {
			try {
				const environments = await environmentManagementAPI.list();
				let hasLocalDocker = false;
				if (browser) {
					// Check for local Docker only in browser context
					try {
						const localDockerCheckUrl = '/api/environments/0/containers?limit=1';
						const dockerResponse = await fetch(localDockerCheckUrl);
						hasLocalDocker = dockerResponse.ok;
					} catch (e) {
						console.warn('Failed to check for local Docker:', e);
						hasLocalDocker = false;
					}
				}
				await environmentStore.initialize(environments, hasLocalDocker);
			} catch (error) {
				console.error('Failed to load and initialize environments in layout load:', error);
				await environmentStore.initialize([], false); // Initialize with empty state
			}
		}

		const isOnboardingPath = path.startsWith('/onboarding');
		if (!isOnboardingPath && settings && settings.onboarding && !settings.onboarding.completed) {
			throw redirect(302, '/onboarding/welcome');
		}
	}

	if (updateCheckDisabled) {
		versionInformation = { currentVersion: '0.15.0' } as AppVersionInformation;
	} else {
		const cacheExpired = versionInformationLastUpdated && Date.now() - versionInformationLastUpdated > 1000 * 60 * 60 * 3;
		if (!versionInformation || cacheExpired) {
			try {
				const versionResponse = await fetch('/_app/version.json');
				if (versionResponse.ok) {
					const versionData = await versionResponse.json();
					versionInformation = { currentVersion: versionData.version } as AppVersionInformation;
					versionInformationLastUpdated = Date.now();
				} else {
					throw new Error('Version endpoint not available');
				}
			} catch (error) {
				console.error('Error fetching version information:', error);
				versionInformation = { currentVersion: 'Unknown' } as AppVersionInformation;
			}
		}
	}

	return {
		csrf,
		user,
		isAuthenticated,
		settings,
		versionInformation,
		updateCheckDisabled
	};
};
