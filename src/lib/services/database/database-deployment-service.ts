/**
 * Database Deployment Service
 * Handles deployment CRUD operations using Drizzle ORM
 */

import { eq, desc, and } from 'drizzle-orm';
import { db, initializeDatabase } from '$lib/database';
import { deployments, deploymentLogs, deploymentHistory } from '$lib/database/schema';
import type { Deployment } from '$lib/types/deployment.type';

export class DatabaseDeploymentService {
	private static instance: DatabaseDeploymentService | null = null;
	private initialized = false;

	static getInstance(): DatabaseDeploymentService {
		if (!DatabaseDeploymentService.instance) {
			DatabaseDeploymentService.instance = new DatabaseDeploymentService();
		}
		return DatabaseDeploymentService.instance;
	}

	private async init(): Promise<void> {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	/**
	 * Map deployment status from Deployment type to database enum
	 */
	private mapDeploymentStatus(status: string): 'pending' | 'deploying' | 'deployed' | 'failed' | 'removing' | 'removed' | 'updating' {
		switch (status) {
			case 'running':
				return 'deployed';
			case 'stopped':
				return 'removed';
			case 'completed':
				return 'deployed';
			case 'failed':
				return 'failed';
			case 'pending':
			default:
				return 'pending';
		}
	}

	/**
	 * Map database status back to Deployment type status
	 */
	private mapDatabaseStatus(status: string): 'pending' | 'running' | 'stopped' | 'failed' | 'completed' {
		switch (status) {
			case 'deployed':
				return 'completed';
			case 'deploying':
				return 'running';
			case 'removed':
				return 'stopped';
			case 'failed':
				return 'failed';
			case 'updating':
				return 'running';
			case 'removing':
				return 'stopped';
			case 'pending':
			default:
				return 'pending';
		}
	}

	/**
	 * Save a deployment to the database
	 */
	async saveDeployment(deployment: Deployment): Promise<Deployment> {
		await this.init();

		try {
			// Map Deployment to database fields
			const dbDeployment = {
				id: deployment.id,
				name: deployment.name,
				agentId: deployment.agentId,
				stackName: deployment.metadata?.stackName || deployment.name,
				stackPath: `/data/stacks/${deployment.metadata?.stackName || deployment.name}`,
				status: this.mapDeploymentStatus(deployment.status),
				deploymentType: 'compose' as const, // Default to compose for now
				composeContent: deployment.metadata?.composeContent || null,
				environment: deployment.metadata?.envContent ? { envContent: deployment.metadata.envContent } : null,
				networks: null,
				volumes: deployment.metadata?.volumes ? { volumes: deployment.metadata.volumes } : null,
				services: null,
				error: deployment.error || null,
				deployedAt: deployment.status === 'completed' || deployment.status === 'running' ? deployment.updatedAt || deployment.createdAt : null,
				removedAt: deployment.status === 'stopped' ? deployment.updatedAt : null,
				createdAt: deployment.createdAt,
				updatedAt: deployment.updatedAt || new Date().toISOString()
			};

			// Use insert with onConflictDoUpdate to handle both insert and update
			await db
				.insert(deployments)
				.values(dbDeployment)
				.onConflictDoUpdate({
					target: deployments.id,
					set: {
						name: dbDeployment.name,
						agentId: dbDeployment.agentId,
						stackName: dbDeployment.stackName,
						stackPath: dbDeployment.stackPath,
						status: dbDeployment.status,
						deploymentType: dbDeployment.deploymentType,
						composeContent: dbDeployment.composeContent,
						environment: dbDeployment.environment,
						networks: dbDeployment.networks,
						volumes: dbDeployment.volumes,
						services: dbDeployment.services,
						error: dbDeployment.error,
						deployedAt: dbDeployment.deployedAt,
						removedAt: dbDeployment.removedAt,
						updatedAt: dbDeployment.updatedAt
					}
				});

			console.log(`✅ Saved deployment: ${deployment.id}`);
			return deployment;
		} catch (error) {
			console.error('❌ Error saving deployment:', error);
			throw new Error(`Failed to save deployment: ${error}`);
		}
	}

	/**
	 * Get a deployment by ID
	 */
	async getDeploymentById(id: string): Promise<Deployment | null> {
		await this.init();

		try {
			const result = await db.select().from(deployments).where(eq(deployments.id, id)).limit(1);

			if (result.length === 0) {
				return null;
			}

			const dbDeployment = result[0];

			// Map database fields back to Deployment type
			const deployment: Deployment = {
				id: dbDeployment.id,
				name: dbDeployment.name,
				type: 'stack', // Default to stack based on current usage
				status: this.mapDatabaseStatus(dbDeployment.status),
				agentId: dbDeployment.agentId,
				createdAt: dbDeployment.createdAt,
				updatedAt: dbDeployment.updatedAt,
				metadata: {
					stackName: dbDeployment.stackName,
					composeContent: dbDeployment.composeContent || undefined,
					envContent: dbDeployment.environment ? (dbDeployment.environment as any).envContent : undefined,
					volumes: dbDeployment.volumes ? (dbDeployment.volumes as any).volumes : undefined
				},
				error: dbDeployment.error || undefined
			};

			return deployment;
		} catch (error) {
			console.error('❌ Error getting deployment:', error);
			throw new Error(`Failed to get deployment: ${error}`);
		}
	}

	/**
	 * List all deployments
	 */
	async listDeployments(): Promise<Deployment[]> {
		await this.init();

		try {
			const results = await db.select().from(deployments).orderBy(desc(deployments.createdAt));

			return results.map((dbDeployment) => ({
				id: dbDeployment.id,
				name: dbDeployment.name,
				type: 'stack' as const,
				status: this.mapDatabaseStatus(dbDeployment.status),
				agentId: dbDeployment.agentId,
				createdAt: dbDeployment.createdAt,
				updatedAt: dbDeployment.updatedAt,
				metadata: {
					stackName: dbDeployment.stackName,
					composeContent: dbDeployment.composeContent || undefined,
					envContent: dbDeployment.environment ? (dbDeployment.environment as any).envContent : undefined,
					volumes: dbDeployment.volumes ? (dbDeployment.volumes as any).volumes : undefined
				},
				error: dbDeployment.error || undefined
			}));
		} catch (error) {
			console.error('❌ Error listing deployments:', error);
			throw new Error(`Failed to list deployments: ${error}`);
		}
	}

	/**
	 * List deployments by agent ID
	 */
	async listDeploymentsByAgent(agentId: string): Promise<Deployment[]> {
		await this.init();

		try {
			const results = await db.select().from(deployments).where(eq(deployments.agentId, agentId)).orderBy(desc(deployments.createdAt));

			return results.map((dbDeployment) => ({
				id: dbDeployment.id,
				name: dbDeployment.name,
				type: 'stack' as const,
				status: this.mapDatabaseStatus(dbDeployment.status),
				agentId: dbDeployment.agentId,
				createdAt: dbDeployment.createdAt,
				updatedAt: dbDeployment.updatedAt,
				metadata: {
					stackName: dbDeployment.stackName,
					composeContent: dbDeployment.composeContent || undefined,
					envContent: dbDeployment.environment ? (dbDeployment.environment as any).envContent : undefined,
					volumes: dbDeployment.volumes ? (dbDeployment.volumes as any).volumes : undefined
				},
				error: dbDeployment.error || undefined
			}));
		} catch (error) {
			console.error('❌ Error listing deployments by agent:', error);
			throw new Error(`Failed to list deployments by agent: ${error}`);
		}
	}

	/**
	 * Update deployment status
	 */
	async updateDeploymentStatus(id: string, status: string, error?: string): Promise<void> {
		await this.init();

		try {
			const dbStatus = this.mapDeploymentStatus(status);
			const updateData: any = {
				status: dbStatus,
				updatedAt: new Date().toISOString(),
				error: error || null
			};

			// Set deployment timestamps based on status
			if (dbStatus === 'deployed') {
				updateData.deployedAt = new Date().toISOString();
			} else if (dbStatus === 'removed') {
				updateData.removedAt = new Date().toISOString();
			}

			await db.update(deployments).set(updateData).where(eq(deployments.id, id));

			console.log(`✅ Updated deployment ${id} status to ${status}`);
		} catch (error) {
			console.error('❌ Error updating deployment status:', error);
			throw new Error(`Failed to update deployment status: ${error}`);
		}
	}

	/**
	 * Delete a deployment
	 */
	async deleteDeployment(id: string): Promise<void> {
		await this.init();

		try {
			await db.delete(deployments).where(eq(deployments.id, id));

			console.log(`✅ Deleted deployment: ${id}`);
		} catch (error) {
			console.error('❌ Error deleting deployment:', error);
			throw new Error(`Failed to delete deployment: ${error}`);
		}
	}

	/**
	 * Get deployments by status
	 */
	async getDeploymentsByStatus(status: string): Promise<Deployment[]> {
		await this.init();

		try {
			const dbStatus = this.mapDeploymentStatus(status);
			const results = await db.select().from(deployments).where(eq(deployments.status, dbStatus)).orderBy(desc(deployments.createdAt));

			return results.map((dbDeployment) => ({
				id: dbDeployment.id,
				name: dbDeployment.name,
				type: 'stack' as const,
				status: this.mapDatabaseStatus(dbDeployment.status),
				agentId: dbDeployment.agentId,
				createdAt: dbDeployment.createdAt,
				updatedAt: dbDeployment.updatedAt,
				metadata: {
					stackName: dbDeployment.stackName,
					composeContent: dbDeployment.composeContent || undefined,
					envContent: dbDeployment.environment ? (dbDeployment.environment as any).envContent : undefined,
					volumes: dbDeployment.volumes ? (dbDeployment.volumes as any).volumes : undefined
				},
				error: dbDeployment.error || undefined
			}));
		} catch (error) {
			console.error('❌ Error getting deployments by status:', error);
			throw new Error(`Failed to get deployments by status: ${error}`);
		}
	}

	/**
	 * Create a new deployment (equivalent to createDeployment from file service)
	 */
	async createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
		const { nanoid } = await import('nanoid');

		const newDeployment: Deployment = {
			...deployment,
			id: nanoid(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		return await this.saveDeployment(newDeployment);
	}

	/**
	 * Update a deployment (equivalent to updateDeployment from file service)
	 */
	async updateDeployment(deploymentId: string, updates: Partial<Deployment>): Promise<Deployment | null> {
		await this.init();

		try {
			const existingDeployment = await this.getDeploymentById(deploymentId);
			if (!existingDeployment) {
				return null;
			}

			const updatedDeployment = {
				...existingDeployment,
				...updates,
				updatedAt: new Date().toISOString()
			};

			await this.saveDeployment(updatedDeployment);
			return updatedDeployment;
		} catch (error) {
			console.error('❌ Error updating deployment:', error);
			return null;
		}
	}

	/**
	 * Get a deployment by ID (alias for getDeploymentById for compatibility)
	 */
	async getDeployment(deploymentId: string): Promise<Deployment | null> {
		return await this.getDeploymentById(deploymentId);
	}

	/**
	 * Get deployments (equivalent to getDeployments from file service)
	 */
	async getDeployments(agentId?: string): Promise<Deployment[]> {
		if (agentId) {
			return await this.listDeploymentsByAgent(agentId);
		}
		return await this.listDeployments();
	}

	/**
	 * Delete a deployment and return success status
	 */
	async deleteDeploymentWithStatus(deploymentId: string): Promise<boolean> {
		try {
			await this.deleteDeployment(deploymentId);
			return true;
		} catch (error) {
			console.error('Error deleting deployment:', error);
			return false;
		}
	}

	/**
	 * Create a stack deployment (equivalent to createStackDeployment from file service)
	 */
	async createStackDeployment(agentId: string, stackName: string, composeContent: string, envContent?: string, taskId?: string): Promise<Deployment> {
		return await this.createDeployment({
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

	/**
	 * Create a container deployment (equivalent to createContainerDeployment from file service)
	 */
	async createContainerDeployment(agentId: string, containerName: string, imageName: string, ports?: string[], volumes?: string[], taskId?: string): Promise<Deployment> {
		return await this.createDeployment({
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

	/**
	 * Create an image deployment (equivalent to createImageDeployment from file service)
	 */
	async createImageDeployment(agentId: string, imageName: string, taskId?: string): Promise<Deployment> {
		return await this.createDeployment({
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

	/**
	 * Update deployment from task (equivalent to updateDeploymentFromTask from file service)
	 */
	async updateDeploymentFromTask(taskId: string, status: string, result?: any, error?: string): Promise<void> {
		try {
			// Find deployment by taskId
			const deployments = await this.listDeployments();
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

				await this.updateDeployment(deployment.id, {
					status: deploymentStatus,
					error: status === 'failed' ? error : undefined
				});
			}
		} catch (err) {
			console.error('Error updating deployment from task:', err);
		}
	}
}

// Export singleton instance
export const databaseDeploymentService = DatabaseDeploymentService.getInstance();
