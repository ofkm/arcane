export interface AgentMetrics {
	containerCount?: number;
	imageCount?: number;
	stackCount?: number;
	networkCount?: number;
	volumeCount?: number;
}

export interface Agent {
	id: string;
	hostname: string;
	platform: string;
	version: string;
	capabilities: string[];
	status: 'online' | 'offline';
	lastSeen: string;
	registeredAt: string;
	metrics?: AgentMetrics;
	dockerInfo?: {
		version: string;
		containers: number;
		images: number;
	};
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt?: string;
}

export interface AgentTask {
	id: string;
	agentId: string;
	type: 'docker_command' | 'stack_deploy' | 'image_pull' | 'health_check' | 'container_start' | 'container_stop' | 'container_restart' | 'container_remove' | 'agent_upgrade';
	payload: Record<string, any>;
	status: 'pending' | 'running' | 'completed' | 'failed';
	result?: any;
	error?: string;
	createdAt: string;
	updatedAt?: string;
}

// Specific payload types for different task types
export interface DockerCommandPayload {
	command: string;
	args: string[];
}

export interface StackDeployPayload {
	stackId: string;
	composeContent: string;
	envContent?: string;
}

export interface ImagePullPayload {
	imageName: string;
}

export interface ContainerActionPayload {
	containerId: string;
	force?: boolean;
}

export interface AgentUpgradePayload {
	action: 'upgrade';
	version?: string;
}
