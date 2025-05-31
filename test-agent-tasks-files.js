// Simple Agent Tasks Migration Test
console.log('🧪 Testing Agent Tasks Migration\n');

// Read a sample agent task file to see what we're working with
const fs = require('fs');
const path = require('path');

const agentTasksDir = '/Users/kylemendell/dev/ofkm/arcane/data/agent-tasks';

try {
	// List all agent task files
	const files = fs.readdirSync(agentTasksDir);
	console.log(`📁 Found ${files.length} agent task files`);

	if (files.length > 0) {
		// Read the first file
		const firstFile = files[0];
		const filePath = path.join(agentTasksDir, firstFile);
		const content = fs.readFileSync(filePath, 'utf8');
		const task = JSON.parse(content);

		console.log('📄 Sample agent task:', {
			id: task.id,
			agentId: task.agentId,
			type: task.type,
			status: task.status,
			createdAt: task.createdAt,
			hasPayload: !!task.payload,
			hasResult: !!task.result
		});

		console.log('\n✅ Agent task files are accessible and contain valid data');
		console.log('🔄 Ready for database migration');
	} else {
		console.log('❌ No agent task files found');
	}
} catch (error) {
	console.error('❌ Error reading agent task files:', error);
}
