import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import type { LayoutLoad } from './$types';

let versionInformation: AppVersionInformation;
let versionInformationLastUpdated: number;

export const load = (async ({ fetch, url }) => {
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
	let user = null;
	let settings = null;
	let agents: any[] = [];
	let hasLocalDocker = false;
	let isAuthenticated = false;

	// Only fetch data on the client side to avoid SSR issues
	if (browser) {
		try {
			// First, try to get settings (public endpoint for initial setup)
			const settingsResponse = await fetch('/api/settings', {
				credentials: 'include'
			});

			if (settingsResponse.ok) {
				const settingsData = await settingsResponse.json();
				settings = settingsData.data || null;
			} else if (settingsResponse.status === 401) {
				// Not authenticated - this is fine for login page
				console.log('Not authenticated, will show login page');
			}
		} catch (error) {
			console.log('Could not fetch settings:', error);
		}

		try {
			// Try to fetch current user from Go backend
			const userResponse = await fetch('/api/auth/me', {
				credentials: 'include'
			});
			if (userResponse.ok) {
				const userData = await userResponse.json();
				user = userData.data || null;
				isAuthenticated = !!user;
			} else if (userResponse.status === 401) {
				// Not authenticated
				isAuthenticated = false;
			}
		} catch (error) {
			console.log('No authenticated user:', error);
			isAuthenticated = false;
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
				if (browser) {
					const versionResponse = await fetch('/_app/version.json');
					if (versionResponse.ok) {
						versionInformation = await versionResponse.json();
					} else {
						throw new Error('Version endpoint not available');
					}
				} else {
					versionInformation = { currentVersion: '0.15.0' } as AppVersionInformation;
				}
				versionInformationLastUpdated = Date.now();
			} catch (error) {
				console.error('Error fetching version information:', error);
				versionInformation = { currentVersion: '0.15.0' } as AppVersionInformation;
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
}) satisfies LayoutLoad;
