import type { Agent, AgentTask } from '$lib/types/agent.type';
import { nanoid } from 'nanoid';
import { updateDeploymentFromTask } from '$lib/services/deployment-service';
import { databaseAgentService } from '$lib/services/database/database-agent-service';
import { databaseAgentTasksService } from '$lib/services/database/database-agent-tasks-service';

export async function registerAgent(agent: Agent): Promise<Agent> {
	const existing = await getAgent(agent.id);

	if (existing) {
		// Update existing agent
		return await updateAgent(agent.id, {
			...agent,
			status: 'online',
			lastSeen: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
	} else {
		// Create new agent
		const newAgent: Agent = {
			...agent,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		return await databaseAgentService.saveAgent(newAgent);
	}
}

export async function getAgent(agentId: string): Promise<Agent | null> {
	return await databaseAgentService.getAgentById(agentId);
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
	const existing = await databaseAgentService.getAgentById(agentId);
	if (!existing) {
		throw new Error('Agent not found');
	}

	const updated: Agent = {
		...existing,
		...updates,
		updatedAt: new Date().toISOString()
	};

	return await databaseAgentService.saveAgent(updated);
}

export async function updateAgentHeartbeat(agentId: string): Promise<void> {
	await updateAgent(agentId, {
		status: 'online',
		lastSeen: new Date().toISOString()
	});
}

export async function listAgents(): Promise<Agent[]> {
	return await databaseAgentService.listAgents();
}

// --- AGENT TASKS: DATABASE ONLY ---

export async function sendTaskToAgent(agentId: string, taskType: string, payload: any): Promise<AgentTask> {
	const agent = await getAgent(agentId);
	if (!agent) {
		throw new Error(`Agent ${agentId} not found`);
	}

	if (agent.status !== 'online') {
		throw new Error(`Agent ${agentId} is not online (status: ${agent.status})`);
	}

	const task: AgentTask = {
		id: nanoid(),
		agentId,
		type: taskType as any,
		payload,
		status: 'pending',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	await databaseAgentTasksService.saveAgentTask(task);
	console.log(`📋 Task ${task.id} created for agent ${agentId} (will be picked up on next poll)`);
	return task;
}

export async function updateTaskStatus(taskId: string, status: string, result?: any, error?: string): Promise<void> {
	await databaseAgentTasksService.updateAgentTaskStatus(taskId, status, result, error);
	await updateDeploymentFromTask(taskId, status, result, error);
	console.log(`Task ${taskId} status updated to: ${status}`);
}

export async function getTask(taskId: string): Promise<AgentTask | null> {
	return await databaseAgentTasksService.getAgentTaskById(taskId);
}

export async function listTasks(agentId?: string): Promise<AgentTask[]> {
	if (agentId) {
		return await databaseAgentTasksService.listAgentTasksByAgent(agentId);
	}
	return await databaseAgentTasksService.listAgentTasks();
}

export async function getAgentTasks(agentId: string): Promise<AgentTask[]> {
	return listTasks(agentId);
}

// Helper functions remain the same
export async function sendDockerCommand(agentId: string, command: string, args: string[] = []): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'docker_command', {
		command,
		args
	});
}

export async function deployStackToAgent(agentId: string, stackId: string, composeContent: string, envContent?: string): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'stack_deploy', {
		stackId,
		composeContent,
		envContent
	});
}

export async function pullImageOnAgent(agentId: string, imageName: string): Promise<AgentTask> {
	return sendTaskToAgent(agentId, 'image_pull', {
		imageName
	});
}

export async function processAgentMessage(agentId: string, message: any): Promise<void> {
	console.log(`Processing message from agent ${agentId}:`, message);

	if (message.type === 'task_result') {
		const { task_id, status, result, error } = message.data;
		await updateTaskStatus(task_id, status, result, error);
	}
}
