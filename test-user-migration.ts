#!/usr/bin/env tsx

import { userMigrationService } from './src/lib/services/user-migration-service';
import { databaseUserService } from './src/lib/services/database-user-service';

async function main() {
	console.log('🔍 Testing user migration service...');

	try {
		// Check current user counts
		console.log('\n📊 Checking current user counts...');
		const counts = await userMigrationService.getUserCount();
		console.log(`  - Users in files: ${counts.files}`);
		console.log(`  - Users in database: ${counts.database}`);

		// Run migration
		console.log('\n🔄 Running user migration...');
		const result = await userMigrationService.migrateUsersFromFiles();

		if (result.success) {
			console.log('✅ User migration completed successfully!');
		} else {
			console.log('❌ User migration completed with errors:');
			result.errors.forEach((error) => console.log(`  - ${error}`));
		}

		// Check counts after migration
		console.log('\n📊 Checking user counts after migration...');
		const newCounts = await userMigrationService.getUserCount();
		console.log(`  - Users in files: ${newCounts.files}`);
		console.log(`  - Users in database: ${newCounts.database}`);

		// Test database user service
		console.log('\n🧪 Testing database user service...');
		const users = await databaseUserService.listUsers();
		console.log(`  - Found ${users.length} users in database`);

		if (users.length > 0) {
			const firstUser = users[0];
			console.log(`  - First user: ${firstUser.username} (${firstUser.email})`);

			// Test getUserById
			const userById = await databaseUserService.getUserById(firstUser.id);
			console.log(`  - getUserById test: ${userById ? '✅ Success' : '❌ Failed'}`);

			// Test getUserByUsername
			const userByUsername = await databaseUserService.getUserByUsername(firstUser.username);
			console.log(`  - getUserByUsername test: ${userByUsername ? '✅ Success' : '❌ Failed'}`);
		}

		console.log('\n🎉 User migration test completed!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

main();
