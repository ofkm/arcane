import fs from 'fs/promises';
import path from 'node:path';
import { BASE_PATH } from '$lib/services/paths-service';
import type { Deployment } from '$lib/types/deployment.type';
import { nanoid } from 'nanoid';

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

	const filePath = path.join(DEPLOYMENTS_DIR, `${newDeployment.id}.json`);
	await fs.writeFile(filePath, JSON.stringify(newDeployment, null, 2));

	return newDeployment;
}

export async function updateDeployment(deploymentId: string, updates: Partial<Deployment>): Promise<Deployment | null> {
	try {
		const filePath = path.join(DEPLOYMENTS_DIR, `${deploymentId}.json`);
		const deploymentData = await fs.readFile(filePath, 'utf-8');
		const deployment = JSON.parse(deploymentData);

		const updatedDeployment = {
			...deployment,
			...updates,
			updatedAt: new Date().toISOString()
		};

		await fs.writeFile(filePath, JSON.stringify(updatedDeployment, null, 2));
		return updatedDeployment;
	} catch (error) {
		console.error('Error updating deployment:', error);
		return null;
	}
}

export async function getDeployment(deploymentId: string): Promise<Deployment | null> {
	try {
		const filePath = path.join(DEPLOYMENTS_DIR, `${deploymentId}.json`);
		const deploymentData = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(deploymentData);
	} catch (error) {
		return null;
	}
}

export async function getDeployments(agentId?: string): Promise<Deployment[]> {
	try {
		const files = await fs.readdir(DEPLOYMENTS_DIR);
		const deployments: Deployment[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				const deploymentData = await fs.readFile(path.join(DEPLOYMENTS_DIR, file), 'utf-8');
				const deployment = JSON.parse(deploymentData);

				if (!agentId || deployment.agentId === agentId) {
					deployments.push(deployment);
				}
			}
		}

		return deployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	} catch (error) {
		console.error('Error listing deployments:', error);
		return [];
	}
}

export async function deleteDeployment(deploymentId: string): Promise<boolean> {
	try {
		const filePath = path.join(DEPLOYMENTS_DIR, `${deploymentId}.json`);
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		console.error('Error deleting deployment:', error);
		return false;
	}
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
		// Find deployment by taskId
		const deployments = await getDeployments();
		const deployment = deployments.find((d) => d.taskId === taskId);

		if (deployment) {
			let deploymentStatus: Deployment['status'];

			switch (status) {
				case 'completed':
					deploymentStatus = 'completed';
					break;
				case 'failed':
					deploymentStatus = 'failed';
					break;
				case 'running':
					deploymentStatus = 'running';
					break;
				default:
					deploymentStatus = 'pending';
			}

			await updateDeployment(deployment.id, {
				status: deploymentStatus,
				error: status === 'failed' ? error : undefined
			});
		}
	} catch (err) {
		console.error('Error updating deployment from task:', err);
	}
}
