import { stackAPI, agentAPI } from '$lib/services/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		// Get managed stacks, external stacks, and agents in parallel
		const [managedStacks, externalStacks, agents] = await Promise.all([
			stackAPI.list().catch((err) => {
				console.warn('Failed to load managed stacks:', err);
				return [];
			}),
			stackAPI.discoverExternal().catch((err) => {
				console.warn('Failed to discover external stacks:', err);
				return [];
			}),
			agentAPI.listWithStatus().catch((err) => {
				console.warn('Failed to load agents:', err);
				return [];
			})
		]);

		// Filter for online agents (this filtering is now done by the backend in listWithStatus)
		const onlineAgents = agents.filter((agent) => agent.status === 'online');

		// Get stacks from all online agents
		const agentStacks = [];
		for (const agent of onlineAgents) {
			try {
				const stacks = await agentAPI.getStacks(agent.id);
				// Add agent info to each stack
				const stacksWithAgent = stacks.map((stack) => ({
					...stack,
					agentId: agent.id,
					agentName: agent.hostname
				}));
				agentStacks.push(...stacksWithAgent);
			} catch (error) {
				console.warn(`Failed to get stacks from agent ${agent.id}:`, error);
			}
		}

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
			agentError: null
		};
	} catch (error) {
		console.error('Failed to load compose page:', error);
		return {
			stacks: [],
			agents: [],
			error: error instanceof Error ? error.message : 'Failed to load Docker Compose stacks',
			agentError: null
		};
	}
};
