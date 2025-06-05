export interface Deployment {
	id: string;
	name: string;
	type: 'stack' | 'container' | 'image';
	status: 'pending' | 'running' | 'stopped' | 'failed' | 'completed';
	agentId: string;
	createdAt: string;
	updatedAt?: string;
	metadata?: {
		stackName?: string;
		imageName?: string;
		containerName?: string;
		composeContent?: string;
		envContent?: string;
		ports?: string[];
		volumes?: string[];
	};
	taskId?: string;
	error?: string;
}

export interface DeploymentTask {
	deploymentId: string;
	taskId: string;
	status: 'pending' | 'running' | 'completed' | 'failed';
	result?: any;
	error?: string;
}

export interface DeploymentStatus {
	id: string;
	stackName: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	progress: number;
	startTime: string;
	endTime?: string;
	logs: string[];
	error?: string;
	config: DeploymentConfig;
}

export interface DeploymentConfig {
	stackName: string;
	composeContent: string;
	envVars?: Record<string, string>;
	pullImages?: boolean;
	recreateContainers?: boolean;
	removeOrphans?: boolean;
	timeout?: number;
	template?: {
		id: string;
		name: string;
		variables: Record<string, string>;
	};
}

export interface DeploymentLog {
	timestamp: string;
	level: 'info' | 'warn' | 'error' | 'debug';
	message: string;
	service?: string;
}
