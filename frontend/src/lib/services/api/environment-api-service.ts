import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import { agentAPI } from './index';
import type { CreateTaskDTO } from '$lib/dto/agent-dto';

export class EnvironmentAPIService {
	async getContainers(): Promise<any[]> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker containers should use direct API calls');
		}

		return await agentAPI.getAgentContainers(currentEnvironment.id);
	}

	async getImages(): Promise<any[]> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker images should use direct API calls');
		}

		return await agentAPI.getAgentImages(currentEnvironment.id);
	}

	async getNetworks(): Promise<any[]> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker networks should use direct API calls');
		}

		return await agentAPI.getAgentNetworks(currentEnvironment.id);
	}

	async getVolumes(): Promise<any[]> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker volumes should use direct API calls');
		}

		return await agentAPI.getAgentVolumes(currentEnvironment.id);
	}

	async getAllResources(): Promise<Record<string, any>> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker resources should use direct API calls');
		}

		return await agentAPI.getAgentResources(currentEnvironment.id);
	}

	async syncResources(): Promise<void> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			return;
		}

		await agentAPI.syncAgentResources(currentEnvironment.id);
	}

	async executeDockerCommand(command: string, args: string[] = []): Promise<any> {
		const currentEnvironment = get(environmentStore.selected);

		if (!currentEnvironment || currentEnvironment.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Local Docker commands should use direct API calls');
		}

		const taskData: CreateTaskDTO = {
			type: 'docker_command',
			payload: {
				command,
				args
			}
		};

		const task = await agentAPI.createTask(currentEnvironment.id, taskData);

		return this.pollForTaskResult(task.id);
	}

	private async pollForTaskResult(taskId: string, maxAttempts = 30, interval = 1000): Promise<any> {
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const task = await agentAPI.getTask(taskId);

			if (task.status === 'completed') {
				return task.result;
			}

			if (task.status === 'failed') {
				throw new Error(task.error || 'Task failed');
			}

			await new Promise((resolve) => setTimeout(resolve, interval));
		}

		throw new Error('Task timeout');
	}
}

export const environmentAPI = new EnvironmentAPIService();
