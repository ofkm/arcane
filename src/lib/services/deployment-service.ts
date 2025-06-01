import { databaseDeploymentService } from '$lib/services/database/database-deployment-service';
import type { Deployment } from '$lib/types/deployment.type';

// All functions now delegate to the database deployment service
export async function createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
	return await databaseDeploymentService.createDeployment(deployment);
}

export async function updateDeployment(deploymentId: string, updates: Partial<Deployment>): Promise<Deployment | null> {
	return await databaseDeploymentService.updateDeployment(deploymentId, updates);
}

export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
	return await databaseDeploymentService.getDeployment(deploymentId);
}

export async function getDeployments(agentId?: string): Promise<Deployment[]> {
	return await databaseDeploymentService.getDeployments(agentId);
}

export async function deleteDeployment(deploymentId: string): Promise<boolean> {
	return await databaseDeploymentService.deleteDeploymentWithStatus(deploymentId);
}

// Helper functions for creating specific deployment types
export async function createStackDeployment(agentId: string, stackName: string, composeContent: string, envContent?: string, taskId?: string): Promise<Deployment> {
	return await databaseDeploymentService.createStackDeployment(agentId, stackName, composeContent, envContent, taskId);
}

export async function createContainerDeployment(agentId: string, containerName: string, imageName: string, ports?: string[], volumes?: string[], taskId?: string): Promise<Deployment> {
	return await databaseDeploymentService.createContainerDeployment(agentId, containerName, imageName, ports, volumes, taskId);
}

export async function createImageDeployment(agentId: string, imageName: string, taskId?: string): Promise<Deployment> {
	return await databaseDeploymentService.createImageDeployment(agentId, imageName, taskId);
}

// Update deployment status based on task completion
export async function updateDeploymentFromTask(taskId: string, status: string, result?: any, error?: string): Promise<void> {
	return await databaseDeploymentService.updateDeploymentFromTask(taskId, status, result, error);
}
