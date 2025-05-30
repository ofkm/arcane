import { loadComposeStacks, discoverExternalStacks } from '$lib/services/docker/stack-service';
import { listAgents } from '$lib/services/agent/agent-manager';
import type { PageServerLoad } from './$types';
import { tryCatch } from '$lib/utils/try-catch';

export const load: PageServerLoad = async () => {
	const [managedResult, externalResult, agentsResult] = await Promise.all([tryCatch(loadComposeStacks()), tryCatch(discoverExternalStacks()), tryCatch(listAgents())]);

	if (managedResult.error || externalResult.error) {
		console.error('Failed to load stacks:', managedResult.error || externalResult.error);
		const errorMessage = (managedResult.error?.message || externalResult.error?.message) ?? 'Unknown error';
		return {
			stacks: [],
			error: 'Failed to load Docker Compose stacks: ' + errorMessage
		};
	}

	const managedStacks = managedResult.data;
	const externalStacks = externalResult.data;
	const agents = agentsResult.data || [];
	const combinedStacks = [...managedStacks];

	// Add external stacks
	for (const externalStack of externalStacks) {
		if (!combinedStacks.some((stack) => stack.id === externalStack.id)) {
			combinedStacks.push(externalStack);
		}
	}

	// Add agent stacks - we'll need to fetch these from agents
	// For now, let's add a placeholder that indicates we need agent stacks
	const onlineAgents = agents.filter((agent) => {
		const now = new Date();
		const lastSeen = new Date(agent.lastSeen);
		const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
		const timeout = 5 * 60 * 1000; // 5 minutes
		return timeSinceLastSeen <= timeout && agent.status === 'online';
	});

	return {
		stacks: combinedStacks,
		agents: onlineAgents
	};
};
