import { agentTasksMigrationService } from './src/lib/services/agent-tasks-migration-service.js';

async function main() {
	console.log('🚀 Starting Agent Tasks Migration');
	console.log('='.repeat(50));

	try {
		// Get migration status
		const status = await agentTasksMigrationService.getMigrationStatus();
		console.log(`📊 Migration Status:`);
		console.log(`   Already migrated: ${status.migrated}`);
		console.log(`   Files found: ${status.fileCount}`);
		console.log(`   Database count: ${status.dbCount}`);
		console.log('');

		// Run migration
		const result = await agentTasksMigrationService.migrateAgentTasks();

		console.log('📋 Migration Results:');
		console.log(`   Success: ${result.success}`);
		console.log(`   Migrated: ${result.migratedCount} agent tasks`);
		console.log(`   Errors: ${result.errors.length}`);

		if (result.errors.length > 0) {
			console.log('\n❌ Errors:');
			result.errors.forEach((error) => console.log(`   - ${error}`));
		}

		// Get final status
		const finalStatus = await agentTasksMigrationService.getMigrationStatus();
		console.log('\n📊 Final Status:');
		console.log(`   Database count: ${finalStatus.dbCount}`);
		console.log(`   Migration complete: ${finalStatus.migrated}`);

		console.log('\n✅ Agent Tasks Migration Complete!');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	}
}

main();
