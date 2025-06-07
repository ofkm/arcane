import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import settingsStore from '$lib/stores/config-store';
import { settingsAPI, userAPI } from '$lib/services/api';

let versionInformation: AppVersionInformation;
let versionInformationLastUpdated: number;

export const load = async ({ fetch, url }) => {
	// Generate CSRF token - use crypto API if available, fallback to random string
	let csrf: string;
	try {
		csrf = crypto.randomUUID();
	} catch {
		csrf = Math.random().toString(36).substring(2) + Date.now().toString(36);
	}

	// If update checks are disabled via env var, return minimal data
	const updateCheckDisabled = env.PUBLIC_UPDATE_CHECK_DISABLED === 'true';

	// Initialize default data
	let agents: any[] = [];
	let hasLocalDocker = false;
	let isAuthenticated = false;

	const path = url.pathname;

	// Define paths that don't require authentication
	const publicPaths = ['/auth/login', '/auth/logout', '/auth/oidc/login', '/auth/oidc/callback', '/img', '/favicon.ico'];
	const isPublicPath = publicPaths.some((p) => path.startsWith(p));
	const settings = await settingsAPI.getSettings();
	const user = await userAPI.getCurrentUser();
	if (user) {
		isAuthenticated = true;
	}

	if (!isPublicPath && !isAuthenticated) {
		throw redirect(302, `/auth/login?redirect=${encodeURIComponent(path)}`);
	}

	if (isAuthenticated && !isPublicPath) {
		const isOnboardingPath = path.startsWith('/onboarding');

		if (!isOnboardingPath && settings && !settings.onboarding?.completed) {
			throw redirect(302, '/onboarding/welcome');
		}
	}

	// Only fetch additional data if authenticated
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
		const cacheExpired = versionInformationLastUpdated && Date.now() - versionInformationLastUpdated > 1000 * 60 * 60 * 3;

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
		versionInformation,
		user,
		settings,
		csrf,
		agents,
		hasLocalDocker,
		isAuthenticated
	};
};
