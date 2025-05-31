import { sendTaskToAgent } from '$lib/services/agent/agent-manager';
import type { Agent } from '$lib/types/agent.type';
import type { Stack } from '$lib/types/docker/stack.type';

export interface AgentStack extends Stack {
	agentId: string;
	agentHostname: string;
	isRemote: true;
}

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
					if (!stacksData && updatedTask.task.result.output) {
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
