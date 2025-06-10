import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import settingsStore from '$lib/stores/config-store';
import { settingsAPI, userAPI } from '$lib/services/api';

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

	let agents: any[] = [];
	let hasLocalDocker = false;
	let isAuthenticated = false;
	let user = null;

	const path = url.pathname;

	const publicPaths = [
		'/auth/login',
		'/auth/logout',
		'/auth/oidc/login',
		'/auth/oidc/callback',
		'/img',
		'/favicon.ico'
	];
	const isPublicPath = publicPaths.some((p) => path.startsWith(p));

	let settings: any = null;
	try {
		settings = await settingsAPI.getSettings();
	} catch (e: any) {
		if (isPublicPath) {
			try {
				const publicSettingsResponse = await fetch('/api/settings/public');
				if (publicSettingsResponse.ok) {
					const publicData = await publicSettingsResponse.json();
					settings = publicData.data;
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
		console.error(`Error while checking user authentication status: ${e.message}`);
		user = null;
		isAuthenticated = false;
	}

	if (!isPublicPath && !isAuthenticated) {
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	if (isAuthenticated && !isPublicPath) {
		const isOnboardingPath = path.startsWith('/onboarding');

		if (!isOnboardingPath && settings && settings.onboarding && !settings.onboarding.completed) {
			throw redirect(302, '/onboarding/welcome');
		}
	}

	if (isAuthenticated && user) {
		try {
			// Fetch agents
			const agentsResponse = await fetch('/api/agents', {
				credentials: 'include'
			});
			if (agentsResponse.ok) {
				const agentsData = await agentsResponse.json();
				agents = agentsData.data || [];
			}
		} catch (error) {
			console.log('Could not fetch agents:', error);
		}

		try {
			// Check if local Docker is available
			const dockerResponse = await fetch('/api/containers?limit=1', {
				credentials: 'include'
			});
			hasLocalDocker = dockerResponse.ok;
		} catch (error) {
			console.log('Docker not available:', error);
		}
	}

	// Handle version information
	if (updateCheckDisabled) {
		versionInformation = {
			currentVersion: '0.15.0'
		} as AppVersionInformation;
	} else {
		const cacheExpired =
			versionInformationLastUpdated &&
			Date.now() - versionInformationLastUpdated > 1000 * 60 * 60 * 3;

		if (!versionInformation || cacheExpired) {
			try {
				const versionResponse = await fetch('/_app/version.json');
				if (versionResponse.ok) {
					const versionData = await versionResponse.json();
					versionInformation = {
						currentVersion: versionData.version
					} as AppVersionInformation;
				} else {
					console.error('Version endpoint returned status:', versionResponse.status);
					throw new Error('Version endpoint not available');
				}
				versionInformationLastUpdated = Date.now();
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
		agents,
		hasLocalDocker,
		versionInformation,
		updateCheckDisabled
	};
};
