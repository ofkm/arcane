#!/usr/bin/env node

// Simple test script for agent tasks migration

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Starting Agent Tasks Migration Test...\n');

// Create a simple node script that can test the migration
const testScript = `
const path = require('path');

// Set up the TypeScript environment
require('ts-node/register');

// Add path alias
const moduleAlias = require('module-alias');
moduleAlias.addAlias('$lib', path.join(__dirname, 'src/lib'));

async function runTest() {
    try {
        console.log('📊 Testing agent tasks migration...');
        
        // Import the services
        const { agentTasksMigrationService } = require('./src/lib/services/agent-tasks-migration-service.ts');
        const { databaseAgentTasksService } = require('./src/lib/services/database-agent-tasks-service.ts');
        
        // Check migration status
        console.log('Checking migration status...');
        const status = await agentTasksMigrationService.getMigrationStatus();
        console.log('Migration status:', status);
        
        // Run migration
        console.log('Running migration...');
        const result = await agentTasksMigrationService.migrateAgentTasks();
        console.log('Migration result:', result);
        
        // Check database
        console.log('Checking database...');
        const tasks = await databaseAgentTasksService.listAgentTasks();
        console.log(\`Database has \${tasks.length} agent tasks\`);
        
        if (tasks.length > 0) {
            console.log('First task:', {
                id: tasks[0].id,
                agentId: tasks[0].agentId,
                type: tasks[0].type,
                status: tasks[0].status
            });
        }
        
        console.log('✅ Test completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

runTest();
`;

// Write the test script to a temporary file
require('fs').writeFileSync('temp-test.js', testScript);

// Run the test script
const child = spawn('node', ['temp-test.js'], {
	stdio: 'inherit',
	cwd: process.cwd()
});

child.on('close', (code) => {
	// Clean up
	try {
		require('fs').unlinkSync('temp-test.js');
	} catch (e) {
		// Ignore cleanup errors
	}

	if (code === 0) {
		console.log('\n🎉 Agent Tasks Migration Test Complete!');
	} else {
		console.log(`\n❌ Test failed with exit code ${code}`);
	}
});
