import BaseAPIService from './api-service';
import type { AgentStack } from '$lib/services/agent/agent-stack-service';
import type { Agent } from '$lib/types/agent.type';

export default class AgentStackAPIService extends BaseAPIService {
	/**
	 * Get all stacks from a specific agent
	 */
	async getStacks(agentId: string): Promise<AgentStack[]> {
		const res = await this.api.get(`/agents/${agentId}/stacks`);
		return res.data.stacks || [];
	}

	/**
	 * Get stacks from all available agents
	 */
	async getAllAgentStacks(agents: Agent[]): Promise<AgentStack[]> {
		try {
			const allStacks: AgentStack[] = [];

			// Process agents sequentially to avoid overwhelming the server
			for (const agent of agents) {
				if (agent.status === 'online') {
					try {
						const stacks = await this.getStacks(agent.id);
						allStacks.push(...stacks);
					} catch (error) {
						console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
					}
				}
			}

			return allStacks;
		} catch (error) {
			console.error('Failed to get stacks from agents:', error);
			return [];
		}
	}
}
