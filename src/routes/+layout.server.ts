import { version as currentVersion } from '$app/environment';
import { env } from '$env/dynamic/private';
import AppConfigService from '$lib/services/app-config-service';
import type { AppVersionInformation } from '$lib/types/application-configuration';
import type { LayoutServerLoad } from './$types';
import { listAgents } from '$lib/services/agent/agent-manager';
import { testDockerConnection } from '$lib/services/docker/core';

let versionInformation: AppVersionInformation;
let versionInformationLastUpdated: number;

export const load = (async (locals) => {
	// If update checks are disabled via env var, return only current version
	const updateCheckDisabled = env.UPDATE_CHECK_DISABLED === 'true';
	const csrf = crypto.randomUUID();

	if (updateCheckDisabled) {
		return {
			versionInformation: {
				currentVersion
			} as AppVersionInformation,
			user: locals.locals.user || null
		};
	}

	const agents = await listAgents();

	// Calculate actual status on server side
	const now = new Date();
	const timeout = 5 * 60 * 1000; // 5 minutes

	const agentsWithStatus = agents.map((agent) => {
		const lastSeen = new Date(agent.lastSeen);
		const timeSinceLastSeen = now.getTime() - lastSeen.getTime();

		return {
			...agent,
			status: timeSinceLastSeen > timeout ? 'offline' : agent.status
		};
	});

	// Check if local Docker is available
	let hasLocalDocker = false;
	try {
		hasLocalDocker = await testDockerConnection();
	} catch (error) {
		console.log('Local Docker not available:', error);
		hasLocalDocker = false;
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
		user: locals.locals.user || null,
		csrf,
		agents: agentsWithStatus,
		hasLocalDocker
	};
}) satisfies LayoutServerLoad;
