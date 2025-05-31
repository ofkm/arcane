// Test Agent Tasks Migration
// This file tests the agent tasks migration and database services

import { hybridAgentTasksService } from '$lib/services/hybrid-agent-tasks-service';
import { agentTasksMigrationService } from '$lib/services/agent-tasks-migration-service';
import { databaseAgentTasksService } from '$lib/services/database-agent-tasks-service';
import type { AgentTask } from '$lib/types/agent.type';

async function testAgentTasksMigration() {
	console.log('🧪 Starting Agent Tasks Migration Test...\n');

	try {
		// 1. Check initial migration status
		console.log('📊 Checking migration status...');
		const initialStatus = await agentTasksMigrationService.getMigrationStatus();
		console.log('Initial migration status:', initialStatus);

		// 2. Test migration
		console.log('\n🔄 Testing migration...');
		const migrationResult = await agentTasksMigrationService.migrateAgentTasks();
		console.log('Migration result:', migrationResult);

		// 3. Check final migration status
		console.log('\n📊 Checking final migration status...');
		const finalStatus = await agentTasksMigrationService.getMigrationStatus();
		console.log('Final migration status:', finalStatus);

		// 4. Test database service directly
		console.log('\n🗄️ Testing database service...');
		const dbAgentTasks = await databaseAgentTasksService.listAgentTasks();
		console.log(`Database contains ${dbAgentTasks.length} agent tasks`);

		if (dbAgentTasks.length > 0) {
			const firstTask = dbAgentTasks[0];
			console.log('First agent task:', {
				id: firstTask.id,
				agentId: firstTask.agentId,
				type: firstTask.type,
				status: firstTask.status,
				createdAt: firstTask.createdAt
			});

			// Test get by ID
			console.log('\n🔍 Testing get by ID...');
			const taskById = await databaseAgentTasksService.getAgentTaskById(firstTask.id);
			console.log('Retrieved task by ID:', taskById ? 'Found' : 'Not found');

			// Test list by agent
			console.log('\n👤 Testing list by agent...');
			const tasksByAgent = await databaseAgentTasksService.listAgentTasksByAgent(firstTask.agentId);
			console.log(`Tasks for agent ${firstTask.agentId}: ${tasksByAgent.length}`);

			// Test get by status
			console.log('\n📋 Testing get by status...');
			const tasksByStatus = await databaseAgentTasksService.getAgentTasksByStatus(firstTask.status);
			console.log(`Tasks with status '${firstTask.status}': ${tasksByStatus.length}`);

			// Test update status
			console.log('\n✏️ Testing update status...');
			const updateResult = await databaseAgentTasksService.updateAgentTaskStatus(firstTask.id, 'in-progress');
			console.log('Update status result:', updateResult);

			// Verify update
			const updatedTask = await databaseAgentTasksService.getAgentTaskById(firstTask.id);
			console.log('Updated task status:', updatedTask?.status);

			// Restore original status
			await databaseAgentTasksService.updateAgentTaskStatus(firstTask.id, firstTask.status);
		}

		// 5. Test hybrid service
		console.log('\n🔗 Testing hybrid service...');
		const hybridTasks = await hybridAgentTasksService.listAgentTasks();
		console.log(`Hybrid service returned ${hybridTasks.length} agent tasks`);

		if (hybridTasks.length > 0) {
			const firstHybridTask = hybridTasks[0];

			// Test get by ID
			const hybridTaskById = await hybridAgentTasksService.getAgentTaskById(firstHybridTask.id);
			console.log('Hybrid get by ID:', hybridTaskById ? 'Found' : 'Not found');

			// Test list by agent
			const hybridTasksByAgent = await hybridAgentTasksService.listAgentTasksByAgent(firstHybridTask.agentId);
			console.log(`Hybrid tasks for agent ${firstHybridTask.agentId}: ${hybridTasksByAgent.length}`);

			// Test get pending tasks
			const pendingTasks = await hybridAgentTasksService.getPendingAgentTasks();
			console.log(`Pending tasks: ${pendingTasks.length}`);
		}

		// 6. Test creating a new agent task
		console.log('\n➕ Testing create new agent task...');
		const newTask: AgentTask = {
			id: `test-${Date.now()}`,
			agentId: 'test-agent',
			type: 'deploy-container',
			status: 'pending',
			payload: {
				containerId: 'test-container',
				action: 'start'
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const savedTask = await hybridAgentTasksService.saveAgentTask(newTask);
		console.log('New task saved:', savedTask.id);

		// Clean up test task
		const deleteResult = await hybridAgentTasksService.deleteAgentTask(savedTask.id);
		console.log('Test task deleted:', deleteResult);

		// 7. Test second migration (should skip existing)
		console.log('\n🔄 Testing second migration (should skip existing)...');
		const secondMigration = await agentTasksMigrationService.migrateAgentTasks();
		console.log('Second migration result:', secondMigration);

		console.log('\n✅ Agent Tasks Migration Test Complete!');
	} catch (error) {
		console.error('❌ Test failed:', error);
	}
}

// Run the test
testAgentTasksMigration();
