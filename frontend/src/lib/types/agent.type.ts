export interface AgentMetrics {
	containerCount: number;
	imageCount: number;
	stackCount: number;
	networkCount: number;
	volumeCount: number;
}

export interface DockerInfo {
	version: string;
	containers: number;
	images: number;
}

export interface Agent {
	id: string;
	hostname: string;
	platform: string;
	version: string;
	capabilities: string[];
	status: 'online' | 'offline' | 'error';
	lastSeen: string;
	registeredAt: string;
	createdAt: string;
	updatedAt?: string;
	metrics?: AgentMetrics;
	dockerInfo?: DockerInfo;
	metadata?: Record<string, any>;
}

export type AgentTaskType = 'docker_command' | 'stack_deploy' | 'compose_create_project' | 'compose_up' | 'image_pull' | 'health_check' | 'container_start' | 'stack_list' | 'container_stop' | 'container_restart' | 'container_remove' | 'agent_upgrade';

export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentTask {
	id: string;
	agentId: string;
	type: AgentTaskType;
	payload: Record<string, any>;
	status: AgentTaskStatus;
	result?: any;
	error?: string;
	createdAt: string;
	updatedAt?: string;
	startedAt?: string;
	completedAt?: string;
}

export interface AgentToken {
	id: string;
	agentId: string;
	token: string;
	name?: string;
	permissions: string[];
	lastUsed?: string;
	expiresAt?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt?: string;
}

export interface AgentStats {
	total: number;
	online: number;
	offline: number;
	totalTasks: number;
	pendingTasks: number;
	runningTasks: number;
	completedTasks: number;
	failedTasks: number;
}

export interface AgentStack {
	id: string;
	name: string;
	status: string;
	serviceCount: number;
	agentId: string;
	agentHostname: string;
	isRemote: true;
	services?: any[];
	networks?: any[];
	volumes?: any[];
	createdAt?: string;
	updatedAt?: string;
}

export type AgentStatus = Agent['status'];
export type OnlineAgent = Agent & { status: 'online' };
