import fs from 'fs/promises';
import path from 'node:path';
import { BASE_PATH } from '$lib/services/paths-service';
import type { Agent, AgentTask } from '$lib/types/agent.type';
import { nanoid } from 'nanoid';
import { updateDeploymentFromTask } from '$lib/services/deployment-service';

const AGENTS_DIR = path.join(BASE_PATH, 'agents');
const TASKS_DIR = path.join(BASE_PATH, 'agent-tasks');

// Ensure directories exist
await fs.mkdir(AGENTS_DIR, { recursive: true });
await fs.mkdir(TASKS_DIR, { recursive: true });

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

		const filePath = path.join(AGENTS_DIR, `${agent.id}.json`);
		await fs.writeFile(filePath, JSON.stringify(newAgent, null, 2));

		return newAgent;
	}
}

export async function getAgent(agentId: string): Promise<Agent | null> {
	try {
		const filePath = path.join(AGENTS_DIR, `${agentId}.json`);
		const agentData = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(agentData);
	} catch (error) {
		return null;
	}
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
	const existing = await getAgent(agentId);
	if (!existing) {
		throw new Error('Agent not found');
	}

	const updated: Agent = {
		...existing,
		...updates,
		updatedAt: new Date().toISOString()
	};

	const filePath = path.join(AGENTS_DIR, `${agentId}.json`);
	await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

	return updated;
}

export async function updateAgentHeartbeat(agentId: string): Promise<void> {
	await updateAgent(agentId, {
		status: 'online',
		lastSeen: new Date().toISOString()
	});
}

export async function listAgents(): Promise<Agent[]> {
	try {
		const files = await fs.readdir(AGENTS_DIR);
		const agents: Agent[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				const agentData = await fs.readFile(path.join(AGENTS_DIR, file), 'utf-8');
				agents.push(JSON.parse(agentData));
			}
		}

		return agents.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
	} catch (error) {
		console.error('Error listing agents:', error);
		return [];
	}
}

// Simplified task creation - no WebSocket sending needed
export async function sendTaskToAgent(agentId: string, taskType: string, payload: any): Promise<AgentTask> {
	const agent = await getAgent(agentId);
	if (!agent) {
		throw new Error(`Agent ${agentId} not found`);
	}

	if (agent.status !== 'online') {
		throw new Error(`Agent ${agentId} is not online (status: ${agent.status})`);
	}

	// Create task
	const task: AgentTask = {
		id: nanoid(),
		agentId,
		type: taskType as any,
		payload,
		status: 'pending', // Agent will pick this up on next poll
		createdAt: new Date().toISOString()
	};

	// Save task to file - agent will fetch this via HTTP
	const filePath = path.join(TASKS_DIR, `${task.id}.json`);
	await fs.writeFile(filePath, JSON.stringify(task, null, 2));

	console.log(`📋 Task ${task.id} created for agent ${agentId} (will be picked up on next poll)`);

	return task;
}

export async function updateTaskStatus(taskId: string, status: string, result?: any, error?: string): Promise<void> {
	try {
		const filePath = path.join(TASKS_DIR, `${taskId}.json`);
		const taskData = await fs.readFile(filePath, 'utf-8');
		const task = JSON.parse(taskData);

		task.status = status;
		task.result = result;
		task.error = error;
		task.completedAt = status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined;

		await fs.writeFile(filePath, JSON.stringify(task, null, 2));

		// Update corresponding deployment if it exists
		await updateDeploymentFromTask(taskId, status, result, error);

		console.log(`Task ${taskId} status updated to: ${status}`);
	} catch (error) {
		console.error('Error updating task status:', error);
	}
}

export async function getTask(taskId: string): Promise<AgentTask | null> {
	try {
		const filePath = path.join(TASKS_DIR, `${taskId}.json`);
		const taskData = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(taskData);
	} catch (error) {
		return null;
	}
}

export async function listTasks(agentId?: string): Promise<AgentTask[]> {
	try {
		const files = await fs.readdir(TASKS_DIR);
		const tasks: AgentTask[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				const taskData = await fs.readFile(path.join(TASKS_DIR, file), 'utf-8');
				const task = JSON.parse(taskData);

				if (!agentId || task.agentId === agentId) {
					tasks.push(task);
				}
			}
		}

		return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	} catch (error) {
		console.error('Error listing tasks:', error);
		return [];
	}
}

// Add this function - it's an alias for listTasks to match the expected API
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
