import { sendTaskToAgent } from '$lib/services/agent/agent-manager';
import type { Agent, AgentStack, StackStatus } from '$lib/types/agent.type';
import type { Stack } from '$lib/types/docker/stack.type';
import { agentStackAPI } from '../api';

// Add this interface to handle server-side request context
export interface ServerFetchContext {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export async function getStacksFromAgent(agent: Agent, context?: ServerFetchContext): Promise<AgentStack[]> {
	try {
		// Send a task to get compose projects from the agent
		const task = await sendTaskToAgent(agent.id, 'stack_list', {});

		// Poll for task completion
		const maxAttempts = 30; // 30 seconds timeout
		const delay = 1000; // 1 second between polls

		console.log(`Polling for stack data from agent ${agent.hostname} (task ${task.id})`);

		for (let i = 0; i < maxAttempts; i++) {
			await new Promise((resolve) => setTimeout(resolve, delay));

			// Fetch the task status - use context.fetch if provided, otherwise use global fetch
			const fetchFunc = context?.fetch || fetch;
			const apiUrl = `/api/agents/${agent.id}/tasks/${task.id}`;

			// Use absolute URL if needed (for server context)
			const updatedTask = await fetchFunc(apiUrl, {
				credentials: 'include'
			}).then((res) => (res.ok ? res.json() : null));

			if (!updatedTask || !updatedTask.task) {
				console.log(`Polling attempt ${i + 1}: No task data received`);
				continue;
			}

			const taskStatus = updatedTask.task.status;
			console.log(`Polling attempt ${i + 1}: Task status is ${taskStatus}`);

			if (taskStatus === 'completed' && updatedTask.task.result) {
				console.log(`Task completed, processing stack data`);

				// Parse the result
				let stacksData;
				try {
					// Handle if the result is already parsed JSON or a string that needs parsing
					if (typeof updatedTask.task.result === 'object') {
						stacksData = updatedTask.task.result;
					} else if (typeof updatedTask.task.result === 'string') {
						stacksData = JSON.parse(updatedTask.task.result);
					}

					// Handle if the output is nested in a result.output field
					// Add null check for updatedTask.task.result before accessing .output
					if (!stacksData && updatedTask.task.result && updatedTask.task.result.output) {
						if (typeof updatedTask.task.result.output === 'object') {
							stacksData = updatedTask.task.result.output;
						} else if (typeof updatedTask.task.result.output === 'string') {
							stacksData = JSON.parse(updatedTask.task.result.output);
						}
					}
				} catch (parseError) {
					console.error(`Failed to parse stack data: ${parseError}`);
					return [];
				}

				if (!stacksData || !stacksData.stacks || !Array.isArray(stacksData.stacks)) {
					console.log(`No valid stacks data found in task result`);
					return [];
				}

				// Convert agent stacks to AgentStack format
				const stacks: AgentStack[] = stacksData.stacks.map((stack: Stack) => ({
					...stack,
					agentId: agent.id,
					agentHostname: agent.hostname,
					isRemote: true,
					// Ensure the important fields are always set
					id: stack.id || `${agent.id}_${stack.name}`,
					name: stack.name,
					status: stack.status || 'unknown',
					serviceCount: stack.serviceCount || stack.services?.length || 0
				}));

				console.log(`Retrieved ${stacks.length} stacks from agent ${agent.hostname}`);
				return stacks;
			} else if (taskStatus === 'failed') {
				console.error(`Task failed: ${updatedTask.task.error || 'Unknown error'}`);
				return [];
			}
			// Continue polling if task is still pending or running
		}

		console.error(`Polling timed out after ${maxAttempts} seconds`);
		return [];
	} catch (error) {
		console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
		return [];
	}
}

export async function getAllAgentStacks(agents: Agent[], context?: ServerFetchContext): Promise<AgentStack[]> {
	const agentStacks: AgentStack[] = [];

	for (const agent of agents) {
		try {
			const stacks = await getStacksFromAgent(agent, context);
			agentStacks.push(...stacks);
		} catch (error) {
			console.error(`Failed to get stacks from agent ${agent.hostname}:`, error);
		}
	}

	return agentStacks;
}

/**
 * Get all stacks managed by agents
 */
export async function listAgentStacks(): Promise<AgentStack[]> {
	try {
		return await agentStackAPI.list();
	} catch (error) {
		console.error('Failed to list agent stacks:', error);
		return [];
	}
}

/**
 * Get stacks for a specific agent
 */
export async function getAgentStacks(agentId: string): Promise<AgentStack[]> {
	try {
		return await agentStackAPI.listByAgent(agentId);
	} catch (error) {
		console.error('Failed to get agent stacks:', error);
		return [];
	}
}

/**
 * Get a specific stack by ID
 */
export async function getAgentStack(stackId: string): Promise<AgentStack | null> {
	try {
		return await agentStackAPI.get(stackId);
	} catch (error) {
		console.error('Failed to get agent stack:', error);
		return null;
	}
}

/**
 * Deploy a stack to an agent
 */
export async function deployAgentStack(
	agentId: string,
	stackData: {
		name: string;
		composeContent: string;
		envContent?: string;
		description?: string;
	}
): Promise<AgentStack> {
	try {
		return await agentStackAPI.deploy(agentId, stackData);
	} catch (error) {
		console.error('Failed to deploy agent stack:', error);
		throw error;
	}
}

/**
 * Update a stack configuration
 */
export async function updateAgentStack(
	stackId: string,
	updates: {
		composeContent?: string;
		envContent?: string;
		description?: string;
	}
): Promise<AgentStack> {
	try {
		return await agentStackAPI.update(stackId, updates);
	} catch (error) {
		console.error('Failed to update agent stack:', error);
		throw error;
	}
}

/**
 * Start a stack
 */
export async function startAgentStack(stackId: string): Promise<void> {
	try {
		await agentStackAPI.start(stackId);
	} catch (error) {
		console.error('Failed to start agent stack:', error);
		throw error;
	}
}

/**
 * Stop a stack
 */
export async function stopAgentStack(stackId: string): Promise<void> {
	try {
		await agentStackAPI.stop(stackId);
	} catch (error) {
		console.error('Failed to stop agent stack:', error);
		throw error;
	}
}

/**
 * Restart a stack
 */
export async function restartAgentStack(stackId: string): Promise<void> {
	try {
		await agentStackAPI.restart(stackId);
	} catch (error) {
		console.error('Failed to restart agent stack:', error);
		throw error;
	}
}

/**
 * Remove/delete a stack
 */
export async function removeAgentStack(stackId: string, removeVolumes = false): Promise<void> {
	try {
		await agentStackAPI.remove(stackId, removeVolumes);
	} catch (error) {
		console.error('Failed to remove agent stack:', error);
		throw error;
	}
}

/**
 * Get stack logs
 */
export async function getAgentStackLogs(
	stackId: string,
	options?: {
		tail?: number;
		since?: string;
		follow?: boolean;
	}
): Promise<string> {
	try {
		return await agentStackAPI.getLogs(stackId, options);
	} catch (error) {
		console.error('Failed to get agent stack logs:', error);
		return '';
	}
}

/**
 * Get stack status and health
 */
export async function getAgentStackStatus(stackId: string): Promise<StackStatus | null> {
	try {
		return await agentStackAPI.getStatus(stackId);
	} catch (error) {
		console.error('Failed to get agent stack status:', error);
		return null;
	}
}

/**
 * Pull latest images for a stack
 */
export async function pullAgentStackImages(stackId: string): Promise<void> {
	try {
		await agentStackAPI.pullImages(stackId);
	} catch (error) {
		console.error('Failed to pull agent stack images:', error);
		throw error;
	}
}

/**
 * Get stack resource usage (CPU, memory, etc.)
 */
export async function getAgentStackResources(stackId: string): Promise<any> {
	try {
		return await agentStackAPI.getResources(stackId);
	} catch (error) {
		console.error('Failed to get agent stack resources:', error);
		return null;
	}
}

/**
 * Scale a service within a stack
 */
export async function scaleAgentStackService(stackId: string, serviceName: string, replicas: number): Promise<void> {
	try {
		await agentStackAPI.scaleService(stackId, serviceName, replicas);
	} catch (error) {
		console.error('Failed to scale agent stack service:', error);
		throw error;
	}
}
