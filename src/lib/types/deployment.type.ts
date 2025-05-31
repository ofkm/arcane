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
