import fs from 'fs/promises';
import path from 'node:path';
import { BASE_PATH } from '$lib/services/paths-service';
import type { Deployment } from '$lib/types/deployment.type';
import { nanoid } from 'nanoid';
import { getDeploymentsFromDb, getDeploymentFromDb, saveDeploymentToDb, updateDeploymentInDb, deleteDeploymentFromDb, getDeploymentByTaskIdFromDb } from './database/deployment-db-service';

const DEPLOYMENTS_DIR = path.join(BASE_PATH, 'deployments');

// Ensure directory exists
await fs.mkdir(DEPLOYMENTS_DIR, { recursive: true });

export async function createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
	const newDeployment: Deployment = {
		...deployment,
		id: nanoid(),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	return await saveDeploymentToDb(newDeployment);
}

export async function updateDeployment(deploymentId: string, updates: Partial<Deployment>): Promise<Deployment | null> {
	try {
		const existingDeployment = await getDeploymentFromDb(deploymentId);

		if (!existingDeployment) {
			console.error('Deployment not found:', deploymentId);
			return null;
		}

		const updatedDeployment = {
			...existingDeployment,
			...updates,
			updatedAt: new Date().toISOString()
		};

		return await saveDeploymentToDb(updatedDeployment);
	} catch (error) {
		console.error('Error updating deployment:', error);
		return null;
	}
}

export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
	return await getDeploymentFromDb(deploymentId);
}

export async function getDeployments(agentId?: string): Promise<Deployment[]> {
	return await getDeploymentsFromDb(agentId);
}

export async function deleteDeployment(deploymentId: string): Promise<boolean> {
	return await deleteDeploymentFromDb(deploymentId);
}

// Helper functions for creating specific deployment types
export async function createStackDeployment(agentId: string, stackName: string, composeContent: string, envContent?: string, taskId?: string): Promise<Deployment> {
	return createDeployment({
		name: stackName,
		type: 'stack',
		status: 'pending',
		agentId,
		metadata: {
			stackName,
			composeContent,
			envContent
		},
		taskId
	});
}

export async function createContainerDeployment(agentId: string, containerName: string, imageName: string, ports?: string[], volumes?: string[], taskId?: string): Promise<Deployment> {
	return createDeployment({
		name: containerName || imageName,
		type: 'container',
		status: 'pending',
		agentId,
		metadata: {
			containerName,
			imageName,
			ports,
			volumes
		},
		taskId
	});
}

export async function createImageDeployment(agentId: string, imageName: string, taskId?: string): Promise<Deployment> {
	return createDeployment({
		name: imageName,
		type: 'image',
		status: 'pending',
		agentId,
		metadata: {
			imageName
		},
		taskId
	});
}

// Update deployment status based on task completion
export async function updateDeploymentFromTask(taskId: string, status: string, result?: any, error?: string): Promise<void> {
	try {
		// Find deployment linked to this task
		const deployment = await getDeploymentByTaskIdFromDb(taskId);

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

		// Update deployment in database
		await updateDeploymentInDb(deployment.id, {
			status: deploymentStatus,
			error: error || undefined
		});

		console.log(`Deployment ${deployment.id} updated to status: ${deploymentStatus}`);
	} catch (error) {
		console.error('Failed to update deployment from task:', error);
		// Don't throw as this shouldn't break the task update
	}
}
