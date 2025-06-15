import type { Agent, AgentStats, AgentTask, AgentTaskType, AgentTaskStatus, AgentMetrics, DockerInfo } from '$lib/types/agent.type';

export interface CreateAgentDTO {
	agent_id: string;
	hostname: string;
	platform?: string;
	version?: string;
	capabilities?: string[];
}

export interface UpdateAgentDTO {
	hostname?: string;
	platform?: string;
	version?: string;
	capabilities?: string[];
	status?: Agent['status'];
	metadata?: Record<string, any>;
}

export interface CreateTaskDTO {
	type: AgentTaskType;
	payload: Record<string, any>;
}

export interface UpdateTaskStatusDTO {
	status: AgentTaskStatus;
	result?: any;
	error?: string;
}

export interface UpdateMetricsDTO {
	containerCount: number;
	imageCount: number;
	stackCount: number;
	networkCount: number;
	volumeCount: number;
}

export interface UpdateDockerInfoDTO {
	version: string;
	containers: number;
	images: number;
}

export interface HeartbeatDTO {
	agent_id: string;
	status: string;
	timestamp: string;
}

export interface DockerCommandDTO {
	command: string;
	args: string[];
}

export interface StackDeployDTO {
	stackId: string;
	composeContent: string;
	envContent?: string;
}

export interface ImagePullDTO {
	imageName: string;
}

export interface ContainerActionDTO {
	containerId: string;
	force?: boolean;
}

export interface AgentUpgradeDTO {
	action: 'upgrade';
	version?: string;
}
