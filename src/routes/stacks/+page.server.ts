import { loadComposeStacks, discoverExternalStacks } from '$lib/services/docker/stack-service';
import { listAgents } from '$lib/services/agent/agent-manager';
import { getAllAgentStacks } from '$lib/services/agent/agent-stack-service';
import type { PageServerLoad } from './$types';
import { tryCatch } from '$lib/utils/try-catch';

export const load: PageServerLoad = async ({ fetch }) => {
	// Get managed stacks, external stacks, and agents in parallel
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

	// Filter for online agents
	const onlineAgents = agents.filter((agent) => {
		const now = new Date();
		const lastSeen = new Date(agent.lastSeen);
		const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
		const timeout = 5 * 60 * 1000; // 5 minutes
		return timeSinceLastSeen <= timeout && agent.status === 'online';
	});

	// Get stacks from all online agents - pass the fetch context
	const agentStacksResult = await tryCatch(getAllAgentStacks(onlineAgents, { fetch }));
	const agentStacks = agentStacksResult.data || [];

	// Create a set of agent stack names to filter out duplicates from external stacks
	const agentStackNames = new Set(agentStacks.map((stack) => stack.name));

	// Merge all stacks together
	const combinedStacks = [...managedStacks];

	// Add external stacks if they don't already exist in combined stacks
	// AND they're not agent stacks (to prevent duplicates)
	for (const externalStack of externalStacks) {
		const isDuplicate = combinedStacks.some((stack) => stack.id === externalStack.id) || agentStackNames.has(externalStack.name);

		if (!isDuplicate) {
			combinedStacks.push(externalStack);
		}
	}

	// Add agent stacks if they don't already exist in combined stacks
	for (const agentStack of agentStacks) {
		// Create a unique ID for agent stacks that won't collide with local stacks
		const uniqueId = `agent:${agentStack.agentId}:${agentStack.name || agentStack.id}`;

		// Only add if not already in the combined stack list
		if (!combinedStacks.some((stack) => stack.id === uniqueId || (stack.name === agentStack.name && stack.agentId === agentStack.agentId))) {
			combinedStacks.push({
				...agentStack,
				id: uniqueId, // Ensure unique ID
				status: agentStack.status || 'unknown' // Ensure status is always defined
			});
		}
	}

	return {
		stacks: combinedStacks,
		agents: onlineAgents,
		agentError: agentStacksResult.error ? `Failed to fetch agent stacks: ${agentStacksResult.error.message}` : null
	};
};
