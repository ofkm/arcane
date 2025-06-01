import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { db, dbManager, initializeDatabase } from '../../database';
import { eq } from 'drizzle-orm';
import { users, userSessions } from '../../database/schema/users';
import { agents, agentTasks } from '../../database/schema/agents';
import { deployments } from '../../database/schema/deployments';
import { stacks } from '../../database/schema/stacks';
import { settings } from '../../database/schema/settings';
import { decrypt as legacyDecrypt } from '../encryption-service';
import { nanoid } from 'nanoid';
import type { Settings } from '$lib/types/settings.type';

export class MigrationService {
	private dataPath = './data';
	private migrationStatusFile = join(this.dataPath, 'migration-status.json');

	async getMigrationStatus(): Promise<{ completed: boolean; lastRun?: string; errors?: string[] }> {
		if (!existsSync(this.migrationStatusFile)) {
			return { completed: false };
		}

		try {
			const status = JSON.parse(readFileSync(this.migrationStatusFile, 'utf8'));
			return status;
		} catch (error) {
			console.error('Failed to read migration status:', error);
			return { completed: false, errors: ['Failed to read migration status'] };
		}
	}

	async setMigrationStatus(status: { completed: boolean; lastRun?: string; errors?: string[] }) {
		try {
			const dir = dirname(this.migrationStatusFile);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(this.migrationStatusFile, JSON.stringify(status, null, 2));
		} catch (error) {
			console.error('Failed to write migration status:', error);
		}
	}

	async migrateFromFileStorage(): Promise<{ success: boolean; errors: string[] }> {
		const errors: string[] = [];

		try {
			console.log('Starting migration from file-based storage to database...');

			// Initialize database first
			await initializeDatabase();

			// Check if migration was already completed
			const migrationStatus = await this.getMigrationStatus();
			if (migrationStatus.completed) {
				console.log('Migration already completed, skipping...');
				return { success: true, errors: [] };
			}

			// Create backup before migration
			const backupPath = await dbManager.backup();
			console.log(`Database backup created: ${backupPath}`);

			// Migrate settings
			const settingsErrors = await this.migrateSettings(db);
			errors.push(...settingsErrors);

			// Migrate users
			const userErrors = await this.migrateUsers(db);
			errors.push(...userErrors);

			// Migrate agents
			const agentErrors = await this.migrateAgents(db);
			errors.push(...agentErrors);

			// Migrate deployments
			const deploymentErrors = await this.migrateDeployments(db);
			errors.push(...deploymentErrors);

			// Migrate stacks
			const stackErrors = await this.migrateStacks(db);
			errors.push(...stackErrors);

			// Migrate agent tasks
			const taskErrors = await this.migrateAgentTasks(db);
			errors.push(...taskErrors);

			// Mark migration as completed
			await this.setMigrationStatus({
				completed: true,
				lastRun: new Date().toISOString(),
				errors: errors.length > 0 ? errors : undefined
			});

			const success = errors.length === 0;
			console.log(`Migration ${success ? 'completed successfully' : 'completed with errors'}`);
			if (errors.length > 0) {
				console.log('Migration errors:', errors);
			}

			return { success, errors };
		} catch (error) {
			const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);

			await this.setMigrationStatus({
				completed: false,
				lastRun: new Date().toISOString(),
				errors
			});

			return { success: false, errors };
		}
	}

	private async migrateSettings(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const settingsFile = join(this.dataPath, 'settings', 'settings.dat');

		if (!existsSync(settingsFile)) {
			console.log('No settings file found, skipping settings migration');
			return errors;
		}

		try {
			console.log('Migrating settings...');
			const encryptedData = readFileSync(settingsFile, 'utf8');

			// Parse the JSON first to get the structure with _encrypted field
			const fileContent = JSON.parse(encryptedData);
			let settingsData: Settings;

			if (fileContent._encrypted) {
				// File is encrypted, decrypt it
				const decryptedData = await legacyDecrypt(fileContent._encrypted);
				settingsData = JSON.parse(decryptedData);
			} else {
				// File is not encrypted, use as is
				settingsData = fileContent;
			}

			// Check if settings already exist
			const existingSettings = await tx.select().from(settings).limit(1);
			if (existingSettings.length > 0) {
				console.log('Settings already exist in database, skipping...');
				return errors;
			}

			// Insert basic settings
			await tx.insert(settings).values({
				dockerHost: settingsData.dockerHost || 'unix:///var/run/docker.sock',
				autoUpdate: settingsData.autoUpdate || false,
				autoUpdateInterval: settingsData.autoUpdateInterval || 5,
				pollingEnabled: settingsData.pollingEnabled ?? true,
				pollingInterval: settingsData.pollingInterval || 10,
				pruneMode: (settingsData.pruneMode === 'dangling' ? 'all' : settingsData.pruneMode) || 'all',
				stacksDirectory: settingsData.stacksDirectory || './data/stacks',
				maturityThresholdDays: settingsData.maturityThresholdDays || 30,
				baseServerUrl: settingsData.baseServerUrl || null,
				onboarding: settingsData.onboarding?.completed || false
			});

			console.log('Settings migration completed');
		} catch (error) {
			const errorMsg = `Failed to migrate settings: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	private async migrateUsers(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const usersDir = join(this.dataPath, 'users');

		if (!existsSync(usersDir)) {
			console.log('No users directory found, skipping user migration');
			return errors;
		}

		try {
			console.log('Migrating users...');
			const { readdirSync } = await import('fs');
			const userFiles = readdirSync(usersDir).filter((file) => file.endsWith('.dat'));

			for (const userFile of userFiles) {
				try {
					const userPath = join(usersDir, userFile);
					const encryptedData = readFileSync(userPath, 'utf8');
					const decryptedData = await legacyDecrypt(encryptedData);
					const userData: any = JSON.parse(decryptedData);

					// Check if user already exists
					const existingUser = await tx.select().from(users).where(eq(users.id, userData.id)).limit(1);
					if (existingUser.length > 0) {
						console.log(`User ${userData.username || userData.email} already exists, skipping...`);
						continue;
					}

					await tx.insert(users).values({
						id: userData.id,
						username: userData.username || userData.email,
						email: userData.email,
						passwordHash: userData.passwordHash ? Buffer.from(userData.passwordHash, 'utf8') : null,
						role: userData.role || 'user',
						isActive: userData.isActive ?? true,
						lastLogin: userData.lastLogin,
						oidcSubjectId: userData.oidcSubjectId || userData.oidcSubject,
						oidcProvider: userData.oidcProvider,
						oidcEmail: userData.oidcEmail,
						oidcName: userData.oidcName,
						oidcPicture: userData.oidcPicture,
						createdAt: userData.createdAt || new Date().toISOString(),
						updatedAt: userData.updatedAt || new Date().toISOString()
					});

					console.log(`Migrated user: ${userData.username || userData.email}`);
				} catch (userError) {
					const errorMsg = `Failed to migrate user from ${userFile}: ${userError instanceof Error ? userError.message : String(userError)}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Users migration completed. Migrated ${userFiles.length} users.`);
		} catch (error) {
			const errorMsg = `Failed to migrate users: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	private async migrateAgents(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const agentsDir = join(this.dataPath, 'agents');

		if (!existsSync(agentsDir)) {
			console.log('No agents directory found, skipping agent migration');
			return errors;
		}

		try {
			console.log('Migrating agents...');
			const { readdirSync } = await import('fs');
			const agentFiles = readdirSync(agentsDir).filter((file) => file.endsWith('.json'));

			for (const agentFile of agentFiles) {
				try {
					const agentPath = join(agentsDir, agentFile);
					const agentData: any = JSON.parse(readFileSync(agentPath, 'utf8'));

					// Check if agent already exists
					const existingAgent = await tx.select().from(agents).where(eq(agents.id, agentData.id)).limit(1);
					if (existingAgent.length > 0) {
						console.log(`Agent ${agentData.name || agentData.id} already exists, skipping...`);
						continue;
					}

					await tx.insert(agents).values({
						id: agentData.id,
						name: agentData.name || agentData.hostname || agentData.id,
						hostname: agentData.hostname,
						dockerHost: agentData.dockerHost,
						status: agentData.status || 'unknown',
						lastSeen: agentData.lastSeen,
						version: agentData.version,
						platform: agentData.platform,
						architecture: agentData.architecture,
						registeredAt: agentData.registeredAt || new Date().toISOString(),
						updatedAt: agentData.updatedAt || new Date().toISOString()
					});

					console.log(`Migrated agent: ${agentData.name || agentData.id}`);
				} catch (agentError) {
					const errorMsg = `Failed to migrate agent from ${agentFile}: ${agentError instanceof Error ? agentError.message : String(agentError)}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Agents migration completed. Migrated ${agentFiles.length} agents.`);
		} catch (error) {
			const errorMsg = `Failed to migrate agents: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	private async migrateDeployments(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const deploymentsDir = join(this.dataPath, 'deployments');

		if (!existsSync(deploymentsDir)) {
			console.log('No deployments directory found, skipping deployment migration');
			return errors;
		}

		try {
			console.log('Migrating deployments...');
			const { readdirSync } = await import('fs');
			const deploymentFiles = readdirSync(deploymentsDir).filter((file) => file.endsWith('.json'));

			for (const deploymentFile of deploymentFiles) {
				try {
					const deploymentPath = join(deploymentsDir, deploymentFile);
					const deploymentData: any = JSON.parse(readFileSync(deploymentPath, 'utf8'));

					// Check if deployment already exists
					const existingDeployment = await tx.select().from(deployments).where(eq(deployments.id, deploymentData.id)).limit(1);
					if (existingDeployment.length > 0) {
						console.log(`Deployment ${deploymentData.name} already exists, skipping...`);
						continue;
					}

					await tx.insert(deployments).values({
						id: deploymentData.id,
						name: deploymentData.name,
						agentId: deploymentData.agentId,
						stackName: deploymentData.stackName,
						stackPath: deploymentData.stackPath,
						status: deploymentData.status || 'pending',
						deploymentType: deploymentData.deploymentType || 'compose',
						composeContent: deploymentData.composeContent,
						environment: deploymentData.environment ? JSON.stringify(deploymentData.environment) : null,
						networks: deploymentData.networks ? JSON.stringify(deploymentData.networks) : null,
						volumes: deploymentData.volumes ? JSON.stringify(deploymentData.volumes) : null,
						services: deploymentData.services ? JSON.stringify(deploymentData.services) : null,
						error: deploymentData.error,
						deployedAt: deploymentData.deployedAt,
						removedAt: deploymentData.removedAt,
						createdAt: deploymentData.createdAt || new Date().toISOString(),
						updatedAt: deploymentData.updatedAt || new Date().toISOString()
					});

					console.log(`Migrated deployment: ${deploymentData.name}`);
				} catch (deploymentError) {
					const errorMsg = `Failed to migrate deployment from ${deploymentFile}: ${deploymentError instanceof Error ? deploymentError.message : String(deploymentError)}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Deployments migration completed. Migrated ${deploymentFiles.length} deployments.`);
		} catch (error) {
			const errorMsg = `Failed to migrate deployments: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	private async migrateStacks(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const stacksDir = join(this.dataPath, 'stacks');

		if (!existsSync(stacksDir)) {
			console.log('No stacks directory found, skipping stack migration');
			return errors;
		}

		try {
			console.log('Migrating stacks...');
			const { readdirSync, statSync } = await import('fs');
			const stackDirs = readdirSync(stacksDir).filter((item) => {
				const itemPath = join(stacksDir, item);
				return statSync(itemPath).isDirectory();
			});

			for (const stackDir of stackDirs) {
				try {
					const stackPath = join(stacksDir, stackDir);
					const composeFileYml = join(stackPath, 'docker-compose.yml');
					const composeFileYaml = join(stackPath, 'compose.yaml');

					// Check for either file variant
					const composeFile = existsSync(composeFileYml) ? 'docker-compose.yml' : existsSync(composeFileYaml) ? 'compose.yaml' : null;

					if (!composeFile) {
						console.log(`No compose file found in ${stackDir}, skipping...`);
						continue;
					}

					// Check if stack already exists
					const existingStack = await tx.select().from(stacks).where(eq(stacks.name, stackDir)).limit(1);
					if (existingStack.length > 0) {
						console.log(`Stack ${stackDir} already exists, skipping...`);
						continue;
					}

					await tx.insert(stacks).values({
						id: nanoid(),
						name: stackDir,
						description: `Migrated stack: ${stackDir}`,
						path: stackDir,
						composeFile,
						isTemplate: false,
						isActive: true,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					});

					console.log(`Migrated stack: ${stackDir} (using ${composeFile})`);
				} catch (stackError) {
					const errorMsg = `Failed to migrate stack ${stackDir}: ${stackError instanceof Error ? stackError.message : String(stackError)}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Stacks migration completed. Migrated ${stackDirs.length} stacks.`);
		} catch (error) {
			const errorMsg = `Failed to migrate stacks: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}

	private async migrateAgentTasks(tx: any): Promise<string[]> {
		const errors: string[] = [];
		const tasksDir = join(this.dataPath, 'agent-tasks');

		if (!existsSync(tasksDir)) {
			console.log('No agent-tasks directory found, skipping task migration');
			return errors;
		}

		try {
			console.log('Migrating agent tasks...');
			const { readdirSync } = await import('fs');
			const taskFiles = readdirSync(tasksDir).filter((file) => file.endsWith('.json'));

			for (const taskFile of taskFiles) {
				try {
					const taskPath = join(tasksDir, taskFile);
					const taskData: any = JSON.parse(readFileSync(taskPath, 'utf8'));

					// Check if task already exists
					const existingTask = await tx.select().from(agentTasks).where(eq(agentTasks.id, taskData.id)).limit(1);
					if (existingTask.length > 0) {
						console.log(`Task ${taskData.id} already exists, skipping...`);
						continue;
					}

					await tx.insert(agentTasks).values({
						id: taskData.id,
						agentId: taskData.agentId,
						type: taskData.type,
						status: taskData.status || 'pending',
						priority: taskData.priority || 5,
						payload: taskData.payload ? JSON.stringify(taskData.payload) : null,
						result: taskData.result ? JSON.stringify(taskData.result) : null,
						error: taskData.error,
						progress: taskData.progress || 0,
						startedAt: taskData.startedAt,
						completedAt: taskData.completedAt,
						createdAt: taskData.createdAt || new Date().toISOString(),
						updatedAt: taskData.updatedAt || new Date().toISOString()
					});

					console.log(`Migrated task: ${taskData.id}`);
				} catch (taskError) {
					const errorMsg = `Failed to migrate task from ${taskFile}: ${taskError instanceof Error ? taskError.message : String(taskError)}`;
					console.error(errorMsg);
					errors.push(errorMsg);
				}
			}

			console.log(`Agent tasks migration completed. Migrated ${taskFiles.length} tasks.`);
		} catch (error) {
			const errorMsg = `Failed to migrate agent tasks: ${error instanceof Error ? error.message : String(error)}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}

		return errors;
	}
}

// Export singleton instance
export const migrationService = new MigrationService();
