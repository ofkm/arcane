import { databaseAgentTasksService } from './src/lib/services/database/database-agent-tasks-service.js';
import { nanoid } from 'nanoid';

async function testAgentTasksDatabase() {
	console.log('🧪 Testing Agent Tasks Database Operations');
	console.log('='.repeat(50));

	try {
		// Test 1: Create a new task
		console.log('1️⃣ Creating new agent task...');
		const testTask = {
			id: nanoid(),
			agentId: 'test-agent-' + nanoid(8),
			type: 'docker_command' as const,
			payload: { command: 'ps', args: ['-a'] },
			status: 'pending' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const savedTask = await databaseAgentTasksService.saveAgentTask(testTask);
		console.log(`✅ Created task: ${savedTask.id}`);

		// Test 2: Get task by ID
		console.log('\n2️⃣ Retrieving task by ID...');
		const retrievedTask = await databaseAgentTasksService.getAgentTaskById(testTask.id);
		console.log(`✅ Retrieved task: ${retrievedTask?.id} - Status: ${retrievedTask?.status}`);

		// Test 3: Update task status
		console.log('\n3️⃣ Updating task status...');
		await databaseAgentTasksService.updateAgentTaskStatus(testTask.id, 'completed', { output: 'Task completed successfully' });
		const updatedTask = await databaseAgentTasksService.getAgentTaskById(testTask.id);
		console.log(`✅ Updated task status: ${updatedTask?.status}`);

		// Test 4: List all tasks
		console.log('\n4️⃣ Listing all agent tasks...');
		const allTasks = await databaseAgentTasksService.listAgentTasks();
		console.log(`✅ Found ${allTasks.length} total agent tasks`);

		// Test 5: Get pending tasks for agent
		console.log('\n5️⃣ Getting pending tasks for agent...');
		const pendingTasks = await databaseAgentTasksService.getPendingAgentTasks(testTask.agentId);
		console.log(`✅ Found ${pendingTasks.length} pending tasks for agent ${testTask.agentId}`);

		// Test 6: List tasks by agent
		console.log('\n6️⃣ Listing tasks by agent...');
		const agentTasks = await databaseAgentTasksService.listAgentTasksByAgent(testTask.agentId);
		console.log(`✅ Found ${agentTasks.length} tasks for agent ${testTask.agentId}`);

		// Test 7: Get tasks by status
		console.log('\n7️⃣ Getting completed tasks...');
		const completedTasks = await databaseAgentTasksService.getAgentTasksByStatus('completed');
		console.log(`✅ Found ${completedTasks.length} completed tasks`);

		// Test 8: Clean up - delete test task
		console.log('\n8️⃣ Cleaning up test task...');
		await databaseAgentTasksService.deleteAgentTask(testTask.id);
		const deletedTask = await databaseAgentTasksService.getAgentTaskById(testTask.id);
		console.log(`✅ Task deleted: ${deletedTask === null ? 'Yes' : 'No'}`);

		console.log('\n🎉 All agent tasks database tests passed!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		throw error;
	}
}

testAgentTasksDatabase().catch(console.error);
