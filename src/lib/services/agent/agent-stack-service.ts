import { sendTaskToAgent } from '$lib/services/agent/agent-manager';
import type { Agent } from '$lib/types/agent.type';
import type { Stack } from '$lib/types/docker/stack.type';

export interface AgentStack extends Stack {
	agentId: string;
	agentHostname: string;
	isRemote: true;
}

export async function getStacksFromAgent(agent: Agent): Promise<AgentStack[]> {
	try {
		// Send a task to get compose projects from the agent
		const task = await sendTaskToAgent(agent.id, 'docker_command', {
			command: 'compose',
			args: ['ls', '--format', 'json']
		});

		// Poll for task completion (you might want to implement a proper polling mechanism)
		// For now, we'll return empty array as this requires async polling
		// This would need to be implemented with proper task polling

		return [];
	} catch (error) {
		console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
		return [];
	}
}

export async function getAllAgentStacks(agents: Agent[]): Promise<AgentStack[]> {
	const agentStacks: AgentStack[] = [];

	for (const agent of agents) {
		try {
			const stacks = await getStacksFromAgent(agent);
			agentStacks.push(...stacks);
		} catch (error) {
			console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
		}
	}

	return agentStacks;
}
