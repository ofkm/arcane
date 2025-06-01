#!/usr/bin/env tsx

/**
 * Migration Completion Verification Script
 *
 * This script provides a comprehensive verification of the migration status
 * from file-based storage to database storage across all data types.
 */

import { userMigrationService } from './src/lib/services/database/user-migration-service';
import { agentMigrationService } from './src/lib/services/agent-migration-service';
import { agentTasksMigrationService } from './src/lib/services/agent-tasks-migration-service';
import { deploymentMigrationService } from './src/lib/services/database/deployment-migration-service';
import { settingsMigrationService } from './src/lib/services/database/settings-migration-service';
import { simpleMigrationService } from './src/lib/services/simple-migration-service';
import { migrationService } from './src/lib/services/database/migration-service';
import { cleanupService } from './src/lib/services/database/cleanup-service';

interface MigrationStatus {
	dataType: string;
	migrated: boolean;
	fileCount: number;
	dbCount: number;
	needsMigration: boolean;
	status: 'Complete' | 'Pending' | 'Partial' | 'Error';
	details?: string;
}

interface MigrationReport {
	overallStatus: 'Complete' | 'Partial' | 'Pending' | 'Error';
	summary: {
		totalDataTypes: number;
		completedMigrations: number;
		pendingMigrations: number;
		partialMigrations: number;
		errors: number;
	};
	dataTypes: MigrationStatus[];
	recommendations: string[];
	databaseInfo?: any;
	cleanupStats?: any;
}

class MigrationVerificationService {
	async verifyUsers(): Promise<MigrationStatus> {
		try {
			// Check if users have been migrated
			const hasMigrated = await this.hasUsersMigrated();
			const userCount = await userMigrationService.getUserCount();

			let status: 'Complete' | 'Pending' | 'Partial' = 'Complete';
			let details = '';

			if (userCount.files > 0 && userCount.database === 0) {
				status = 'Pending';
				details = 'Files exist but no users in database';
			} else if (userCount.files > 0 && userCount.database > 0 && userCount.files !== userCount.database) {
				status = 'Partial';
				details = 'File count does not match database count';
			} else if (userCount.files === 0 && userCount.database === 0) {
				status = 'Complete';
				details = 'No users to migrate';
			}

			return {
				dataType: 'Users',
				migrated: hasMigrated,
				fileCount: userCount.files,
				dbCount: userCount.database,
				needsMigration: userCount.files > 0 && userCount.database === 0,
				status,
				details
			};
		} catch (error) {
			return {
				dataType: 'Users',
				migrated: false,
				fileCount: 0,
				dbCount: 0,
				needsMigration: false,
				status: 'Error',
				details: `Error checking users: ${error}`
			};
		}
	}

	async verifyAgents(): Promise<MigrationStatus> {
		try {
			const hasMigrated = await agentMigrationService.hasAgentsMigrated();
			const migrationStatus = await agentMigrationService.getMigrationStatus();

			let status: 'Complete' | 'Pending' | 'Partial' = 'Complete';
			let details = '';

			if (migrationStatus.fileCount > 0 && migrationStatus.databaseCount === 0) {
				status = 'Pending';
				details = 'Files exist but no agents in database';
			} else if (migrationStatus.fileCount > 0 && migrationStatus.databaseCount > 0 && migrationStatus.fileCount !== migrationStatus.databaseCount) {
				status = 'Partial';
				details = 'File count does not match database count';
			} else if (migrationStatus.fileCount === 0 && migrationStatus.databaseCount === 0) {
				status = 'Complete';
				details = 'No agents to migrate';
			}

			return {
				dataType: 'Agents',
				migrated: hasMigrated,
				fileCount: migrationStatus.fileCount,
				dbCount: migrationStatus.databaseCount,
				needsMigration: migrationStatus.needsMigration,
				status,
				details
			};
		} catch (error) {
			return {
				dataType: 'Agents',
				migrated: false,
				fileCount: 0,
				dbCount: 0,
				needsMigration: false,
				status: 'Error',
				details: `Error checking agents: ${error}`
			};
		}
	}

	async verifyAgentTasks(): Promise<MigrationStatus> {
		try {
			const hasMigrated = await agentTasksMigrationService.hasAgentTasksMigrated();
			const migrationStatus = await agentTasksMigrationService.getMigrationStatus();

			let status: 'Complete' | 'Pending' | 'Partial' = 'Complete';
			let details = '';

			if (migrationStatus.fileCount > 0 && migrationStatus.dbCount === 0) {
				status = 'Pending';
				details = 'Files exist but no agent tasks in database';
			} else if (migrationStatus.fileCount > 0 && migrationStatus.dbCount > 0 && migrationStatus.fileCount !== migrationStatus.dbCount) {
				status = 'Partial';
				details = 'File count does not match database count';
			} else if (migrationStatus.fileCount === 0 && migrationStatus.dbCount === 0) {
				status = 'Complete';
				details = 'No agent tasks to migrate';
			}

			return {
				dataType: 'Agent Tasks',
				migrated: hasMigrated,
				fileCount: migrationStatus.fileCount,
				dbCount: migrationStatus.dbCount,
				needsMigration: migrationStatus.fileCount > 0 && migrationStatus.dbCount === 0,
				status,
				details
			};
		} catch (error) {
			return {
				dataType: 'Agent Tasks',
				migrated: false,
				fileCount: 0,
				dbCount: 0,
				needsMigration: false,
				status: 'Error',
				details: `Error checking agent tasks: ${error}`
			};
		}
	}

	async verifyDeployments(): Promise<MigrationStatus> {
		try {
			const hasMigrated = await deploymentMigrationService.hasDeploymentsMigrated();
			const migrationStatus = await deploymentMigrationService.getMigrationStatus();

			let status: 'Complete' | 'Pending' | 'Partial' = 'Complete';
			let details = '';

			if (migrationStatus.fileCount > 0 && migrationStatus.dbCount === 0) {
				status = 'Pending';
				details = 'Files exist but no deployments in database';
			} else if (migrationStatus.fileCount > 0 && migrationStatus.dbCount > 0 && migrationStatus.fileCount !== migrationStatus.dbCount) {
				status = 'Partial';
				details = 'File count does not match database count';
			} else if (migrationStatus.fileCount === 0 && migrationStatus.dbCount === 0) {
				status = 'Complete';
				details = 'No deployments to migrate';
			}

			return {
				dataType: 'Deployments',
				migrated: hasMigrated,
				fileCount: migrationStatus.fileCount,
				dbCount: migrationStatus.dbCount,
				needsMigration: migrationStatus.fileCount > 0 && migrationStatus.dbCount === 0,
				status,
				details
			};
		} catch (error) {
			return {
				dataType: 'Deployments',
				migrated: false,
				fileCount: 0,
				dbCount: 0,
				needsMigration: false,
				status: 'Error',
				details: `Error checking deployments: ${error}`
			};
		}
	}

	async verifySettings(): Promise<MigrationStatus> {
		try {
			// Settings don't have a direct migration check, so we'll check if settings exist in database
			const settingsResult = await settingsMigrationService.migrateSettings();

			return {
				dataType: 'Settings',
				migrated: settingsResult.success,
				fileCount: 0, // Settings migration doesn't track file count
				dbCount: settingsResult.success ? 1 : 0,
				needsMigration: !settingsResult.success,
				status: settingsResult.success ? 'Complete' : 'Error',
				details: settingsResult.error || 'Settings migrated successfully'
			};
		} catch (error) {
			return {
				dataType: 'Settings',
				migrated: false,
				fileCount: 0,
				dbCount: 0,
				needsMigration: true,
				status: 'Error',
				details: `Error checking settings: ${error}`
			};
		}
	}

	async hasUsersMigrated(): Promise<boolean> {
		try {
			const userCount = await userMigrationService.getUserCount();
			return userCount.database > 0;
		} catch (error) {
			return false;
		}
	}

	async generateReport(): Promise<MigrationReport> {
		console.log('🔍 Verifying migration completion status...');
		console.log('='.repeat(60));

		const verificationTasks = [this.verifyUsers(), this.verifyAgents(), this.verifyAgentTasks(), this.verifyDeployments(), this.verifySettings()];

		const dataTypes = await Promise.all(verificationTasks);

		// Get additional database information
		let databaseInfo;
		let cleanupStats;
		try {
			databaseInfo = await simpleMigrationService.getDatabaseInfo();
			cleanupStats = await cleanupService.getCleanupStats();
		} catch (error) {
			console.warn('⚠️ Could not retrieve additional database information:', error);
		}

		// Calculate summary
		const completedMigrations = dataTypes.filter((dt) => dt.status === 'Complete').length;
		const pendingMigrations = dataTypes.filter((dt) => dt.status === 'Pending').length;
		const partialMigrations = dataTypes.filter((dt) => dt.status === 'Partial').length;
		const errors = dataTypes.filter((dt) => dt.status === 'Error').length;

		let overallStatus: 'Complete' | 'Partial' | 'Pending' | 'Error';
		if (errors > 0) {
			overallStatus = 'Error';
		} else if (pendingMigrations > 0 || partialMigrations > 0) {
			overallStatus = pendingMigrations > 0 ? 'Pending' : 'Partial';
		} else {
			overallStatus = 'Complete';
		}

		// Generate recommendations
		const recommendations: string[] = [];

		for (const dataType of dataTypes) {
			if (dataType.status === 'Pending') {
				recommendations.push(`Run migration for ${dataType.dataType.toLowerCase()}`);
			} else if (dataType.status === 'Partial') {
				recommendations.push(`Verify ${dataType.dataType.toLowerCase()} migration - some files may not have been processed`);
			} else if (dataType.status === 'Error') {
				recommendations.push(`Fix ${dataType.dataType.toLowerCase()} migration errors`);
			}
		}

		if (overallStatus === 'Complete') {
			recommendations.push('All migrations are complete! Consider running database cleanup to optimize performance.');
		}

		return {
			overallStatus,
			summary: {
				totalDataTypes: dataTypes.length,
				completedMigrations,
				pendingMigrations,
				partialMigrations,
				errors
			},
			dataTypes,
			recommendations,
			databaseInfo,
			cleanupStats
		};
	}

	printReport(report: MigrationReport): void {
		console.log('\n📊 MIGRATION COMPLETION REPORT');
		console.log('='.repeat(60));

		// Overall status
		const statusEmoji = {
			Complete: '✅',
			Partial: '⚠️',
			Pending: '🔄',
			Error: '❌'
		};

		console.log(`\n🎯 Overall Status: ${statusEmoji[report.overallStatus]} ${report.overallStatus}`);

		// Summary
		console.log('\n📈 Summary:');
		console.log(`   Total Data Types: ${report.summary.totalDataTypes}`);
		console.log(`   ✅ Completed: ${report.summary.completedMigrations}`);
		console.log(`   🔄 Pending: ${report.summary.pendingMigrations}`);
		console.log(`   ⚠️ Partial: ${report.summary.partialMigrations}`);
		console.log(`   ❌ Errors: ${report.summary.errors}`);

		// Data type details
		console.log('\n📋 Data Type Details:');
		console.log('─'.repeat(80));
		console.log('Data Type      | Status    | Files | DB    | Migrated | Details');
		console.log('─'.repeat(80));

		for (const dataType of report.dataTypes) {
			const status = `${statusEmoji[dataType.status]} ${dataType.status}`;
			const migrated = dataType.migrated ? '✓' : '✗';
			const details = dataType.details || '';
			console.log(`${dataType.dataType.padEnd(14)} | ${status.padEnd(9)} | ${String(dataType.fileCount).padEnd(5)} | ${String(dataType.dbCount).padEnd(5)} | ${migrated.padEnd(8)} | ${details}`);
		}

		// Database information
		if (report.databaseInfo) {
			console.log('\n🗄️ Database Information:');
			console.log(`   Total Tables: ${report.databaseInfo.totalTables}`);
			console.log('   Record Counts:');
			for (const [table, count] of Object.entries(report.databaseInfo.counts)) {
				console.log(`     ${table}: ${count}`);
			}
		}

		// Cleanup statistics
		if (report.cleanupStats) {
			console.log('\n🧹 Database Cleanup Statistics:');
			console.log(`   Database Size: ${report.cleanupStats.databaseSize}`);
			console.log(`   Total Tasks: ${report.cleanupStats.totalTasks}`);
			console.log(`   Old Tasks: ${report.cleanupStats.oldTasks}`);
			console.log(`   Expired Sessions: ${report.cleanupStats.expiredSessions}`);
			console.log(`   Orphaned Records: ${report.cleanupStats.orphanedTasks + report.cleanupStats.orphanedMetrics}`);
		}

		// Recommendations
		if (report.recommendations.length > 0) {
			console.log('\n💡 Recommendations:');
			for (const recommendation of report.recommendations) {
				console.log(`   • ${recommendation}`);
			}
		}

		console.log('\n' + '='.repeat(60));
	}
}

async function main() {
	try {
		const verificationService = new MigrationVerificationService();
		const report = await verificationService.generateReport();

		verificationService.printReport(report);

		// Exit with appropriate code
		if (report.overallStatus === 'Error') {
			process.exit(1);
		} else if (report.overallStatus === 'Pending' || report.overallStatus === 'Partial') {
			process.exit(2); // Indicates partial completion
		} else {
			process.exit(0); // Success
		}
	} catch (error) {
		console.error('❌ Migration verification failed:', error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
