/**
 * Test script for deployment migration
 * This will test the database deployment service and migration functionality
 */

import { HybridDeploymentService } from '../src/lib/services/hybrid-deployment-service';
import { DatabaseDeploymentService } from '../src/lib/services/database-deployment-service';
import { DeploymentMigrationService } from '../src/lib/services/deployment-migration-service';

async function testDeploymentMigration() {
	console.log('🧪 Starting deployment migration test...\n');

	try {
		// Initialize services
		const hybridService = HybridDeploymentService.getInstance();
		const dbService = DatabaseDeploymentService.getInstance();
		const migrationService = DeploymentMigrationService.getInstance();

		// 1. Check initial migration status
		console.log('📊 Checking initial migration status...');
		const initialStatus = await migrationService.getMigrationStatus();
		console.log('Initial status:', initialStatus);
		console.log('');

		// 2. Test deployment migration
		console.log('🔄 Testing deployment migration...');
		const migrationResult = await migrationService.migrateDeployments();
		console.log('Migration result:', migrationResult);
		console.log('');

		// 3. Check migration status after migration
		console.log('📊 Checking migration status after migration...');
		const postStatus = await migrationService.getMigrationStatus();
		console.log('Post-migration status:', postStatus);
		console.log('');

		// 4. Test hybrid service - list deployments
		console.log('📝 Testing hybrid service - listing deployments...');
		const deployments = await hybridService.listDeployments();
		console.log(`Found ${deployments.length} deployments:`);
		deployments.forEach(deployment => {
			console.log(`  - ${deployment.name} (${deployment.id}) - Status: ${deployment.status}`);
		});
		console.log('');

		// 5. Test getting a specific deployment
		if (deployments.length > 0) {
			const firstDeployment = deployments[0];
			console.log(`🔍 Testing get deployment by ID: ${firstDeployment.id}...`);
			const retrievedDeployment = await hybridService.getDeploymentById(firstDeployment.id);
			if (retrievedDeployment) {
				console.log(`✅ Successfully retrieved deployment: ${retrievedDeployment.name}`);
				console.log(`   Agent ID: ${retrievedDeployment.agentId}`);
				console.log(`   Status: ${retrievedDeployment.status}`);
				console.log(`   Type: ${retrievedDeployment.type}`);
				if (retrievedDeployment.metadata?.stackName) {
					console.log(`   Stack: ${retrievedDeployment.metadata.stackName}`);
				}
			} else {
				console.log('❌ Failed to retrieve deployment');
			}
			console.log('');

			// 6. Test status update
			console.log(`🔄 Testing status update for deployment: ${firstDeployment.id}...`);
			await hybridService.updateDeploymentStatus(firstDeployment.id, 'running');
			console.log('✅ Status updated to "running"');
			
			// Verify the update
			const updatedDeployment = await hybridService.getDeploymentById(firstDeployment.id);
			if (updatedDeployment) {
				console.log(`   Updated status: ${updatedDeployment.status}`);
			}
			console.log('');

			// 7. Test filtering by status
			console.log('🔍 Testing get deployments by status...');
			const runningDeployments = await hybridService.getDeploymentsByStatus('running');
			console.log(`Found ${runningDeployments.length} running deployments`);
			console.log('');

			// 8. Test listing by agent
			console.log(`🔍 Testing get deployments by agent: ${firstDeployment.agentId}...`);
			const agentDeployments = await hybridService.listDeploymentsByAgent(firstDeployment.agentId);
			console.log(`Found ${agentDeployments.length} deployments for agent ${firstDeployment.agentId}`);
			console.log('');
		}

		// 9. Test creating a new deployment
		console.log('➕ Testing creating a new deployment...');
		const newDeployment = {
			id: 'test-deployment-' + Date.now(),
			name: 'Test Deployment',
			type: 'stack' as const,
			status: 'pending' as const,
			agentId: 'test-agent-123',
			createdAt: new Date().toISOString(),
			metadata: {
				stackName: 'test-stack',
				composeContent: 'version: "3.8"\nservices:\n  test:\n    image: nginx:alpine\n    ports:\n      - "8080:80"'
			}
		};

		const savedDeployment = await hybridService.saveDeployment(newDeployment);
		console.log(`✅ Created new deployment: ${savedDeployment.name} (${savedDeployment.id})`);
		console.log('');

		// 10. Test second migration run (should skip existing data)
		console.log('🔄 Testing second migration run (should detect existing data)...');
		const secondMigrationResult = await migrationService.migrateDeployments();
		console.log('Second migration result:', secondMigrationResult);
		console.log('');

		// 11. Final status check
		console.log('📊 Final migration status...');
		const finalStatus = await migrationService.getMigrationStatus();
		console.log('Final status:', finalStatus);

		console.log('\n✅ Deployment migration test completed successfully!');

	} catch (error) {
		console.error('\n❌ Deployment migration test failed:', error);
		throw error;
	}
}

// Run the test
testDeploymentMigration().catch(console.error);
