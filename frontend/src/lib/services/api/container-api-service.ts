import BaseAPIService from './api-service';
import { getApiPath } from './api-helpers';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import AgentAPIService from './agent-api-service';
import type { CreateTaskDTO } from '$lib/dto/agent-dto';

export interface CreateContainerRequest {
	name: string;
	image: string;
	command?: string[];
	entrypoint?: string[];
	workingDir?: string;
	user?: string;
	environment?: string[];
	ports?: Record<string, string>;
	volumes?: string[];
	networks?: string[];
	restartPolicy?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
	privileged?: boolean;
	autoRemove?: boolean;
	memory?: number;
	cpus?: number;
}

export default class ContainerAPIService extends BaseAPIService {
	private agentAPI = new AgentAPIService();

	private isLocalEnvironment(): boolean {
		const env = get(environmentStore.selected);
		return !env || env.id === LOCAL_DOCKER_ENVIRONMENT_ID;
	}

	private async executeAgentTask(command: string, args: string[] = []): Promise<any> {
		const env = get(environmentStore.selected);
		if (!env || env.id === LOCAL_DOCKER_ENVIRONMENT_ID) {
			throw new Error('Cannot execute agent task on local environment');
		}

		const taskData: CreateTaskDTO = {
			type: 'docker_command',
			payload: {
				command,
				args
			}
		};

		const task = await this.agentAPI.createTask(env.id, taskData);
		return this.pollForTaskResult(task.id);
	}

	private async pollForTaskResult(taskId: string, maxAttempts = 30, interval = 1000): Promise<any> {
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const task = await this.agentAPI.getTask(taskId);

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

	async list(all: boolean = false) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.get(getApiPath('/containers'), { params: { all } }));
		}

		const env = get(environmentStore.selected);
		return this.agentAPI.getAgentContainers(env!.id);
	}

	async get(id: string) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.get(getApiPath(`/containers/${id}`)));
		}

		const containers = await this.list(true);

		if (!Array.isArray(containers)) {
			throw new Error('Failed to retrieve containers');
		}

		const container = containers.find((c: any) => c.id === id || c.names?.includes(id));

		if (!container) {
			throw new Error('Container not found');
		}

		return container;
	}

	async create(options: CreateContainerRequest) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.post(getApiPath('/containers'), options));
		}

		const args = ['run', '-d'];
		if (options.name) args.push('--name', options.name);
		if (options.workingDir) args.push('--workdir', options.workingDir);
		if (options.user) args.push('--user', options.user);
		if (options.environment) {
			options.environment.forEach((env) => args.push('-e', env));
		}
		if (options.ports) {
			Object.entries(options.ports).forEach(([host, container]) => {
				args.push('-p', `${host}:${container}`);
			});
		}
		if (options.volumes) {
			options.volumes.forEach((vol) => args.push('-v', vol));
		}
		if (options.restartPolicy) args.push('--restart', options.restartPolicy);
		if (options.privileged) args.push('--privileged');
		if (options.autoRemove) args.push('--rm');
		if (options.memory) args.push('--memory', options.memory.toString());
		if (options.cpus) args.push('--cpus', options.cpus.toString());

		args.push(options.image);
		if (options.command) args.push(...options.command);

		return this.executeAgentTask('run', args);
	}

	async inspect(id: string) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.get(getApiPath(`/containers/${id}`)));
		}

		return this.executeAgentTask('inspect', [id]);
	}

	async start(id: string) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.post(getApiPath(`/containers/${id}/start`)));
		}

		return this.executeAgentTask('start', [id]);
	}

	async stop(id: string) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.post(getApiPath(`/containers/${id}/stop`)));
		}

		return this.executeAgentTask('stop', [id]);
	}

	async restart(id: string) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.post(getApiPath(`/containers/${id}/restart`)));
		}

		return this.executeAgentTask('restart', [id]);
	}

	async remove(id: string, options?: { force?: boolean; volumes?: boolean }) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(
				this.api.delete(getApiPath(`/containers/${id}`), {
					params: options
				})
			);
		}

		const args = ['rm'];
		if (options?.force) args.push('--force');
		if (options?.volumes) args.push('--volumes');
		args.push(id);

		return this.executeAgentTask('rm', args);
	}

	async logs(
		id: string,
		options?: {
			tail?: number;
			timestamps?: boolean;
			follow?: boolean;
			since?: string;
			until?: string;
		}
	) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(
				this.api.get(getApiPath(`/containers/${id}/logs`), {
					params: options
				})
			);
		}

		const args = ['logs'];
		if (options?.tail) args.push('--tail', options.tail.toString());
		if (options?.timestamps) args.push('--timestamps');
		if (options?.since) args.push('--since', options.since);
		if (options?.until) args.push('--until', options.until);
		args.push(id);

		return this.executeAgentTask('logs', args);
	}

	async stats(id: string, stream: boolean = false) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(
				this.api.get(getApiPath(`/containers/${id}/stats`), {
					params: { stream }
				})
			);
		}

		const args = ['stats', '--no-stream'];
		if (stream) args.splice(-1, 1);
		args.push(id);

		return this.executeAgentTask('stats', args);
	}

	async isImageInUse(imageId: string): Promise<boolean> {
		if (this.isLocalEnvironment()) {
			const response = await this.api.get(getApiPath(`/containers/image-usage/${imageId}`));
			return response.data.inUse;
		}

		const env = get(environmentStore.selected);
		const containers = await this.agentAPI.getAgentContainers(env!.id);
		return Array.isArray(containers) && containers.some((container: any) => container.Image === imageId || container.ImageID === imageId);
	}

	async prune(filters?: Record<string, string>) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(this.api.post(getApiPath('/containers/prune'), { filters }));
		}

		const args = ['container', 'prune', '--force'];
		if (filters) {
			const filterString = Object.entries(filters)
				.map(([key, value]) => `${key}=${value}`)
				.join(',');
			args.push('--filter', filterString);
		}

		return this.executeAgentTask('system', args);
	}

	async exec(id: string, command: string[]) {
		if (this.isLocalEnvironment()) {
			return this.handleResponse(
				this.api.post(getApiPath(`/containers/${id}/exec`), {
					command
				})
			);
		}

		const args = ['exec', id, ...command];
		return this.executeAgentTask('exec', args);
	}
}
