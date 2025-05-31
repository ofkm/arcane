import { HybridAgentTasksService } from './src/lib/services/hybrid-agent-tasks-service.js';

async function testAgentTasksMigration() {
	console.log('🧪 Testing Agent Tasks Migration and Hybrid Service...\n');

	const hybridService = HybridAgentTasksService.getInstance();

	try {
		// Test 1: List agent tasks (will trigger migration if needed)
		console.log('📋 Testing listAgentTasks (will auto-migrate if needed)...');
		const tasks = await hybridService.listAgentTasks();
		console.log(`   Found ${tasks.length} agent tasks`);

		if (tasks.length > 0) {
			// Test 2: Get specific task
			const firstTask = tasks[0];
			console.log(`\n🔍 Testing getAgentTaskById for task: ${firstTask.id}`);
			const task = await hybridService.getAgentTaskById(firstTask.id);
			console.log(`   Retrieved task: ${task?.id || 'null'}`);

			// Test 3: List tasks by agent
			console.log(`\n👤 Testing listAgentTasksByAgent for agent: ${firstTask.agentId}`);
			const agentTasks = await hybridService.listAgentTasksByAgent(firstTask.agentId);
			console.log(`   Found ${agentTasks.length} tasks for this agent`);

			// Test 4: Get pending tasks
			console.log('\n⏳ Testing getPendingAgentTasks...');
			const pendingTasks = await hybridService.getPendingAgentTasks();
			console.log(`   Found ${pendingTasks.length} pending tasks`);

			// Test 5: Show task details
			console.log('\n📊 Task Details:');
			tasks.slice(0, 5).forEach((task, index) => {
				console.log(`   ${index + 1}. ${task.id}`);
				console.log(`      Agent: ${task.agentId}`);
				console.log(`      Type: ${task.type}`);
				console.log(`      Status: ${task.status}`);
				console.log(`      Created: ${task.createdAt}`);
				console.log('');
			});

			// Test 6: Update task status
			if (firstTask.status !== 'in-progress') {
				console.log(`\n✏️ Testing updateAgentTaskStatus for task: ${firstTask.id}`);
				const originalStatus = firstTask.status;
				await hybridService.updateAgentTaskStatus(firstTask.id, 'in-progress');
				console.log('   Status updated to in-progress');

				// Restore original status
				await hybridService.updateAgentTaskStatus(firstTask.id, originalStatus);
				console.log(`   Status restored to ${originalStatus}`);
			}
		} else {
			console.log('   No agent tasks found. Migration may not have been necessary.');
		}

		// Test 7: Migration status
		console.log('\n📊 Testing getMigrationStatus...');
		const migrationStatus = await hybridService.getMigrationStatus();
		console.log('   Migration status:', migrationStatus);

		console.log('✅ All agent tasks tests completed successfully!');
	} catch (error) {
		console.error('❌ Agent tasks test failed:', error);
		process.exit(1);
	}
}

testAgentTasksMigration();
