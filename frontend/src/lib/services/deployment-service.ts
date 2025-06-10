import { deploymentAPI } from './api';
import type { Deployment } from '$lib/types/deployment.type';

/**
 * Create a new deployment
 */
export async function createDeployment(
	deployment: Omit<Deployment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Deployment> {
	try {
		return await deploymentAPI.create({
			name: deployment.name,
			type: deployment.type,
			status: deployment.status,
			agentId: deployment.agentId,
			taskId: deployment.taskId,
			metadata: deployment.metadata
		});
	} catch (error) {
		console.error('Error creating deployment:', error);
		throw error;
	}
}

/**
 * Update a deployment
 */
export async function updateDeployment(
	deploymentId: string,
	updates: Partial<Deployment>
): Promise<Deployment | null> {
	try {
		return await deploymentAPI.update(deploymentId, {
			name: updates.name,
			status: updates.status,
			error: updates.error,
			metadata: updates.metadata
		});
	} catch (error) {
		console.error('Error updating deployment:', error);
		return null;
	}
}

/**
 * Get a deployment by ID
 */
export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
	try {
		return await deploymentAPI.get(deploymentId);
	} catch (error) {
		console.error('Error getting deployment:', error);
		return null;
	}
}

/**
 * Get deployments, optionally filtered by agent
 */
export async function getDeployments(agentId?: string): Promise<Deployment[]> {
	try {
		return await deploymentAPI.list(agentId);
	} catch (error) {
		console.error('Error getting deployments:', error);
		return [];
	}
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(deploymentId: string): Promise<boolean> {
	try {
		await deploymentAPI.delete(deploymentId);
		return true;
	} catch (error) {
		console.error('Error deleting deployment:', error);
		return false;
	}
}

/**
 * Create a stack deployment
 */
export async function createStackDeployment(
	agentId: string,
	stackName: string,
	composeContent: string,
	envContent?: string,
	taskId?: string
): Promise<Deployment> {
	try {
		return await deploymentAPI.createStackDeployment({
			agentId,
			stackName,
			composeContent,
			envContent,
			taskId
		});
	} catch (error) {
		console.error('Error creating stack deployment:', error);
		throw error;
	}
}

/**
 * Create a container deployment
 */
export async function createContainerDeployment(
	agentId: string,
	containerName: string,
	imageName: string,
	ports?: string[],
	volumes?: string[],
	taskId?: string
): Promise<Deployment> {
	try {
		return await deploymentAPI.createContainerDeployment({
			agentId,
			containerName,
			imageName,
			ports,
			volumes,
			taskId
		});
	} catch (error) {
		console.error('Error creating container deployment:', error);
		throw error;
	}
}

/**
 * Create an image deployment
 */
export async function createImageDeployment(
	agentId: string,
	imageName: string,
	taskId?: string
): Promise<Deployment> {
	try {
		return await deploymentAPI.createImageDeployment({
			agentId,
			imageName,
			taskId
		});
	} catch (error) {
		console.error('Error creating image deployment:', error);
		throw error;
	}
}

/**
 * Update deployment status based on task completion
 */
export async function updateDeploymentFromTask(
	taskId: string,
	status: string,
	result?: any,
	error?: string
): Promise<void> {
	try {
		// Find deployment linked to this task
		const deployment = await deploymentAPI.getByTaskId(taskId);

		if (!deployment) {
			// No deployment linked to this task, nothing to update
			return;
		}

		// Map task status to deployment status
		let deploymentStatus: 'pending' | 'running' | 'stopped' | 'failed' | 'completed';

		switch (status) {
			case 'running':
				deploymentStatus = 'running';
				break;
			case 'completed':
				deploymentStatus = 'completed';
				break;
			case 'failed':
				deploymentStatus = 'failed';
				break;
			default:
				deploymentStatus = 'pending';
		}

		// Update deployment status
		await deploymentAPI.updateStatus(deployment.id, deploymentStatus, error);

		console.log(`Deployment ${deployment.id} updated to status: ${deploymentStatus}`);
	} catch (updateError) {
		console.error('Failed to update deployment from task:', updateError);
		// Don't throw as this shouldn't break the task update
	}
}

/**
 * Get deployments for a specific agent
 */
export async function getAgentDeployments(agentId: string): Promise<Deployment[]> {
	try {
		return await deploymentAPI.getByAgent(agentId);
	} catch (error) {
		console.error('Error getting agent deployments:', error);
		return [];
	}
}

/**
 * Get deployment logs
 */
export async function getDeploymentLogs(deploymentId: string): Promise<string> {
	try {
		return await deploymentAPI.getLogs(deploymentId);
	} catch (error) {
		console.error('Error getting deployment logs:', error);
		return '';
	}
}

/**
 * Get deployment statistics
 */
export async function getDeploymentStats(): Promise<{
	total: number;
	pending: number;
	running: number;
	completed: number;
	failed: number;
	byAgent: Record<string, number>;
	byType: Record<string, number>;
}> {
	try {
		return await deploymentAPI.getStats();
	} catch (error) {
		console.error('Error getting deployment stats:', error);
		return {
			total: 0,
			pending: 0,
			running: 0,
			completed: 0,
			failed: 0,
			byAgent: {},
			byType: {}
		};
	}
}
