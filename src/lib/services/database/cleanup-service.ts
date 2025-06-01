/**
 * Cleanup Service
 * Handles database maintenance, job cleanup, and data retention
 */

import { db, dbManager, initializeDatabase } from '$lib/database';
import { agentTasks, agentMetrics, userSessions, deploymentLogs, deploymentHistory } from '$lib/database/schema';
import { agents, deployments } from '$lib/database/schema';
import { sql, lt, eq, and, desc } from 'drizzle-orm';
import { getSettings } from '../settings-service';

interface CleanupConfig {
	// How long to keep completed/failed tasks (in days)
	taskRetentionDays: number;
	// How long to keep agent metrics (in days)
	metricsRetentionDays: number;
	// How long to keep user sessions (in days)
	sessionRetentionDays: number;
	// How long to keep deployment logs (in days)
	deploymentLogsRetentionDays: number;
	// Maximum number of tasks to keep per agent
	maxTasksPerAgent: number;
	// Whether to cleanup orphaned records
	cleanupOrphanedRecords: boolean;
}

export class CleanupService {
	private static instance: CleanupService | null = null;
	private initialized = false;

	static getInstance(): CleanupService {
		if (!CleanupService.instance) {
			CleanupService.instance = new CleanupService();
		}
		return CleanupService.instance;
	}

	private async init(): Promise<void> {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
		}
	}

	/**
	 * Get default cleanup configuration
	 */
	private getDefaultConfig(): CleanupConfig {
		return {
			taskRetentionDays: 30,
			metricsRetentionDays: 7,
			sessionRetentionDays: 30,
			deploymentLogsRetentionDays: 90,
			maxTasksPerAgent: 1000,
			cleanupOrphanedRecords: true
		};
	}

	/**
	 * Get cleanup configuration from settings or defaults
	 */
	private async getCleanupConfig(): Promise<CleanupConfig> {
		try {
			const settings = await getSettings();

			// You can extend this to read from settings if you add cleanup config to settings
			const config = this.getDefaultConfig();

			// Override with settings if available
			if (settings?.maturityThresholdDays) {
				config.taskRetentionDays = settings.maturityThresholdDays;
			}

			return config;
		} catch (error) {
			console.warn('Failed to get cleanup config from settings, using defaults:', error);
			return this.getDefaultConfig();
		}
	}

	/**
	 * Run comprehensive database cleanup
	 */
	async runCleanup(config?: Partial<CleanupConfig>): Promise<{
		success: boolean;
		summary: {
			tasksRemoved: number;
			metricsRemoved: number;
			sessionsRemoved: number;
			logsRemoved: number;
			orphanedRecordsRemoved: number;
		};
		errors: string[];
	}> {
		await this.init();

		const cleanupConfig = { ...(await this.getCleanupConfig()), ...config };
		const errors: string[] = [];
		const summary = {
			tasksRemoved: 0,
			metricsRemoved: 0,
			sessionsRemoved: 0,
			logsRemoved: 0,
			orphanedRecordsRemoved: 0
		};

		console.log('🧹 Starting database cleanup...');
		console.log('📋 Cleanup config:', cleanupConfig);

		try {
			// 1. Clean up old agent tasks
			try {
				summary.tasksRemoved = await this.cleanupOldTasks(cleanupConfig);
			} catch (error) {
				errors.push(`Task cleanup failed: ${error}`);
			}

			// 2. Clean up old agent metrics
			try {
				summary.metricsRemoved = await this.cleanupOldMetrics(cleanupConfig);
			} catch (error) {
				errors.push(`Metrics cleanup failed: ${error}`);
			}

			// 3. Clean up expired user sessions
			try {
				summary.sessionsRemoved = await this.cleanupExpiredSessions(cleanupConfig);
			} catch (error) {
				errors.push(`Session cleanup failed: ${error}`);
			}

			// 4. Clean up old deployment logs
			try {
				summary.logsRemoved = await this.cleanupOldDeploymentLogs(cleanupConfig);
			} catch (error) {
				errors.push(`Deployment logs cleanup failed: ${error}`);
			}

			// 5. Clean up orphaned records
			if (cleanupConfig.cleanupOrphanedRecords) {
				try {
					summary.orphanedRecordsRemoved = await this.cleanupOrphanedRecords();
				} catch (error) {
					errors.push(`Orphaned records cleanup failed: ${error}`);
				}
			}

			// 6. Vacuum database to reclaim space
			try {
				await this.vacuumDatabase();
			} catch (error) {
				errors.push(`Database vacuum failed: ${error}`);
			}

			const success = errors.length === 0;
			console.log(`${success ? '✅' : '⚠️'} Database cleanup completed`);
			console.log('📊 Summary:', summary);

			if (errors.length > 0) {
				console.log('❌ Errors:', errors);
			}

			return { success, summary, errors };
		} catch (error) {
			const errorMsg = `Database cleanup failed: ${error}`;
			console.error('❌', errorMsg);
			return {
				success: false,
				summary,
				errors: [errorMsg]
			};
		}
	}

	/**
	 * Clean up old agent tasks
	 */
	private async cleanupOldTasks(config: CleanupConfig): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - config.taskRetentionDays);
		const cutoffDateStr = cutoffDate.toISOString();

		console.log(`🗑️ Cleaning up agent tasks older than ${config.taskRetentionDays} days (${cutoffDateStr})...`);

		// Remove old completed/failed tasks
		const result = await db.delete(agentTasks).where(and(lt(agentTasks.createdAt, cutoffDateStr), sql`${agentTasks.status} IN ('completed', 'failed', 'cancelled')`));

		console.log(`✅ Removed ${result.changes} old agent tasks`);
		return result.changes || 0;
	}

	/**
	 * Clean up old agent metrics
	 */
	private async cleanupOldMetrics(config: CleanupConfig): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - config.metricsRetentionDays);
		const cutoffDateStr = cutoffDate.toISOString();

		console.log(`📊 Cleaning up agent metrics older than ${config.metricsRetentionDays} days (${cutoffDateStr})...`);

		const result = await db.delete(agentMetrics).where(lt(agentMetrics.timestamp, cutoffDateStr));

		console.log(`✅ Removed ${result.changes} old agent metrics`);
		return result.changes || 0;
	}

	/**
	 * Clean up expired user sessions
	 */
	private async cleanupExpiredSessions(config: CleanupConfig): Promise<number> {
		const now = new Date().toISOString();

		console.log('🔐 Cleaning up expired user sessions...');

		// Remove sessions that have expired
		const result = await db.delete(userSessions).where(lt(userSessions.expiresAt, now));

		console.log(`✅ Removed ${result.changes} expired user sessions`);
		return result.changes || 0;
	}

	/**
	 * Clean up old deployment logs
	 */
	private async cleanupOldDeploymentLogs(config: CleanupConfig): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - config.deploymentLogsRetentionDays);
		const cutoffDateStr = cutoffDate.toISOString();

		console.log(`📋 Cleaning up deployment logs older than ${config.deploymentLogsRetentionDays} days (${cutoffDateStr})...`);

		let totalRemoved = 0;

		// Clean deployment logs
		try {
			const logsResult = await db.delete(deploymentLogs).where(lt(deploymentLogs.timestamp, cutoffDateStr));

			totalRemoved += logsResult.changes || 0;
		} catch (error) {
			console.warn('Deployment logs table might not exist yet:', error);
		}

		// Clean deployment history
		try {
			const historyResult = await db.delete(deploymentHistory).where(lt(deploymentHistory.timestamp, cutoffDateStr));

			totalRemoved += historyResult.changes || 0;
		} catch (error) {
			console.warn('Deployment history table might not exist yet:', error);
		}

		console.log(`✅ Removed ${totalRemoved} old deployment log entries`);
		return totalRemoved;
	}

	/**
	 * Clean up orphaned records
	 */
	private async cleanupOrphanedRecords(): Promise<number> {
		console.log('🧹 Cleaning up orphaned records...');

		let totalRemoved = 0;

		// Remove agent tasks for agents that no longer exist
		const orphanedTasks = await db.delete(agentTasks).where(sql`${agentTasks.agentId} NOT IN (SELECT ${agents.id} FROM ${agents})`);

		totalRemoved += orphanedTasks.changes || 0;
		console.log(`✅ Removed ${orphanedTasks.changes} orphaned agent tasks`);

		// Remove agent metrics for agents that no longer exist
		const orphanedMetrics = await db.delete(agentMetrics).where(sql`${agentMetrics.agentId} NOT IN (SELECT ${agents.id} FROM ${agents})`);

		totalRemoved += orphanedMetrics.changes || 0;
		console.log(`✅ Removed ${orphanedMetrics.changes} orphaned agent metrics`);

		return totalRemoved;
	}

	/**
	 * Vacuum database to reclaim space
	 */
	private async vacuumDatabase(): Promise<void> {
		console.log('🗜️ Vacuuming database to reclaim space...');

		try {
			await dbManager.vacuum();
			console.log('✅ Database vacuum completed');
		} catch (error) {
			console.error('❌ Database vacuum failed:', error);
			throw error;
		}
	}

	/**
	 * Get cleanup statistics
	 */
	async getCleanupStats(): Promise<{
		totalTasks: number;
		oldTasks: number;
		totalMetrics: number;
		oldMetrics: number;
		expiredSessions: number;
		orphanedTasks: number;
		orphanedMetrics: number;
		databaseSize: string;
	}> {
		await this.init();

		const config = await this.getCleanupConfig();

		const taskCutoff = new Date();
		taskCutoff.setDate(taskCutoff.getDate() - config.taskRetentionDays);

		const metricsCutoff = new Date();
		metricsCutoff.setDate(metricsCutoff.getDate() - config.metricsRetentionDays);

		const now = new Date().toISOString();

		// Get counts
		const totalTasks = await db.select({ count: sql<number>`count(*)` }).from(agentTasks);
		const oldTasks = await db
			.select({ count: sql<number>`count(*)` })
			.from(agentTasks)
			.where(and(lt(agentTasks.createdAt, taskCutoff.toISOString()), sql`${agentTasks.status} IN ('completed', 'failed', 'cancelled')`));

		const totalMetrics = await db.select({ count: sql<number>`count(*)` }).from(agentMetrics);
		const oldMetrics = await db
			.select({ count: sql<number>`count(*)` })
			.from(agentMetrics)
			.where(lt(agentMetrics.timestamp, metricsCutoff.toISOString()));

		const expiredSessions = await db
			.select({ count: sql<number>`count(*)` })
			.from(userSessions)
			.where(lt(userSessions.expiresAt, now));

		const orphanedTasks = await db
			.select({ count: sql<number>`count(*)` })
			.from(agentTasks)
			.where(sql`${agentTasks.agentId} NOT IN (SELECT ${agents.id} FROM ${agents})`);

		const orphanedMetrics = await db
			.select({ count: sql<number>`count(*)` })
			.from(agentMetrics)
			.where(sql`${agentMetrics.agentId} NOT IN (SELECT ${agents.id} FROM ${agents})`);

		// Get database size (example for SQLite)
		const dbSizeResult = await db.all<{ page_count: number; page_size: number }>(sql`PRAGMA page_count, page_size;`);
		const { page_count = 0, page_size = 0 } = dbSizeResult[0] || {};
		const dbSize = page_count * page_size;

		return {
			totalTasks: totalTasks[0]?.count || 0,
			oldTasks: oldTasks[0]?.count || 0,
			totalMetrics: totalMetrics[0]?.count || 0,
			oldMetrics: oldMetrics[0]?.count || 0,
			expiredSessions: expiredSessions[0]?.count || 0,
			orphanedTasks: orphanedTasks[0]?.count || 0,
			orphanedMetrics: orphanedMetrics[0]?.count || 0,
			databaseSize: this.formatBytes(dbSize)
		};
	}

	/**
	 * Format bytes to human readable format
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Schedule automatic cleanup
	 */
	async scheduleCleanup(intervalHours: number = 24): Promise<NodeJS.Timeout> {
		console.log(`⏰ Scheduling automatic cleanup every ${intervalHours} hours`);

		const interval = setInterval(
			async () => {
				try {
					console.log('🕐 Running scheduled cleanup...');
					await this.runCleanup();
				} catch (error) {
					console.error('❌ Scheduled cleanup failed:', error);
				}
			},
			intervalHours * 60 * 60 * 1000
		);

		return interval;
	}
}

// Export singleton instance
export const cleanupService = CleanupService.getInstance();
