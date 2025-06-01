#!/usr/bin/env tsx

/**
 * Migrate Existing File-Based Stacks to Database
 *
 * This script imports existing stacks from the data/stacks directory
 * into the database using the DatabaseStackService.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { databaseStackService } from './src/lib/services/database/database-stack-service';

interface MigrationResult {
	stackName: string;
	success: boolean;
	error?: string;
}

async function migrateExistingStacks(): Promise<MigrationResult[]> {
	console.log('🔄 Starting migration of existing file-based stacks to database...');
	console.log('='.repeat(70));

	const stacksDir = path.join(process.cwd(), 'data', 'stacks');
	const results: MigrationResult[] = [];

	try {
		// Check if stacks directory exists
		const stat = await fs.stat(stacksDir);
		if (!stat.isDirectory()) {
			throw new Error(`Stacks directory not found: ${stacksDir}`);
		}

		// Get all directories in stacks folder
		const entries = await fs.readdir(stacksDir, { withFileTypes: true });
		const stackDirs = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name);

		if (stackDirs.length === 0) {
			console.log('📝 No stack directories found to migrate.');
			return results;
		}

		console.log(`📂 Found ${stackDirs.length} stack directories: ${stackDirs.join(', ')}`);
		console.log('');

		// Process each stack directory
		for (const stackDirName of stackDirs) {
			const stackPath = path.join(stacksDir, stackDirName);
			console.log(`🔍 Processing stack: ${stackDirName}`);

			try {
				// Look for compose files (prefer compose.yaml, fallback to docker-compose.yml)
				let composeContent = '';
				let composeFile = '';

				const possibleComposeFiles = ['compose.yaml', 'docker-compose.yml', 'compose.yml', 'docker-compose.yaml'];

				for (const filename of possibleComposeFiles) {
					const composePath = path.join(stackPath, filename);
					try {
						composeContent = await fs.readFile(composePath, 'utf8');
						composeFile = filename;
						console.log(`   📄 Found compose file: ${composeFile}`);
						break;
					} catch {
						// Continue to next file
					}
				}

				if (!composeContent) {
					throw new Error('No compose file found (looking for compose.yaml, docker-compose.yml, etc.)');
				}

				// Look for .env file
				let envContent = '';
				const envPath = path.join(stackPath, '.env');
				try {
					envContent = await fs.readFile(envPath, 'utf8');
					console.log(`   🔧 Found .env file`);
				} catch {
					console.log(`   ℹ️  No .env file found`);
				}

				// Check if stack already exists in database
				const existingStack = await databaseStackService.getStack(stackDirName);
				if (existingStack) {
					console.log(`   ⚠️  Stack "${stackDirName}" already exists in database, skipping`);
					results.push({
						stackName: stackDirName,
						success: true,
						error: 'Already exists in database'
					});
					continue;
				}

				// Import stack into database
				console.log(`   🔄 Importing stack "${stackDirName}" into database...`);
				const importedStack = await databaseStackService.importStack(stackDirName, composeContent, envContent);

				console.log(`   ✅ Successfully imported stack: ${importedStack.name}`);
				console.log(`      - ID: ${importedStack.id}`);
				console.log(`      - Services: ${importedStack.serviceCount}`);
				console.log(`      - Status: ${importedStack.status}`);

				results.push({
					stackName: stackDirName,
					success: true
				});
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`   ❌ Failed to migrate stack "${stackDirName}": ${errorMessage}`);

				results.push({
					stackName: stackDirName,
					success: false,
					error: errorMessage
				});
			}

			console.log(''); // Empty line between stacks
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Migration failed: ${errorMessage}`);
		results.push({
			stackName: 'GLOBAL',
			success: false,
			error: errorMessage
		});
	}

	return results;
}

function printMigrationReport(results: MigrationResult[]): void {
	console.log('📊 MIGRATION REPORT');
	console.log('='.repeat(70));

	const successful = results.filter((r) => r.success && !r.error?.includes('Already exists'));
	const alreadyExists = results.filter((r) => r.success && r.error?.includes('Already exists'));
	const failed = results.filter((r) => !r.success);

	console.log(`\n📈 Summary:`);
	console.log(`   ✅ Successfully migrated: ${successful.length}`);
	console.log(`   ⚠️  Already existed: ${alreadyExists.length}`);
	console.log(`   ❌ Failed: ${failed.length}`);
	console.log(`   📊 Total processed: ${results.length}`);

	if (successful.length > 0) {
		console.log(`\n✅ Successfully migrated stacks:`);
		for (const result of successful) {
			console.log(`   • ${result.stackName}`);
		}
	}

	if (alreadyExists.length > 0) {
		console.log(`\n⚠️  Stacks already in database:`);
		for (const result of alreadyExists) {
			console.log(`   • ${result.stackName}`);
		}
	}

	if (failed.length > 0) {
		console.log(`\n❌ Failed migrations:`);
		for (const result of failed) {
			console.log(`   • ${result.stackName}: ${result.error}`);
		}
	}

	console.log('\n' + '='.repeat(70));
}

async function main() {
	try {
		const results = await migrateExistingStacks();
		printMigrationReport(results);

		const failedCount = results.filter((r) => !r.success).length;
		if (failedCount > 0) {
			console.log(`\n⚠️  ${failedCount} stacks failed to migrate. Please check the errors above.`);
			process.exit(1);
		} else {
			console.log(`\n🎉 All stacks migrated successfully!`);
			process.exit(0);
		}
	} catch (error) {
		console.error('❌ Migration script failed:', error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
