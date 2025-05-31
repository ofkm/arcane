import { HybridAgentService } from './src/lib/services/hybrid-agent-service.js';

async function testAgentMigration() {
	console.log('🧪 Testing Agent Migration and Hybrid Service...\n');

	const hybridService = HybridAgentService.getInstance();

	try {
		// Test 1: List agents (will trigger migration if needed)
		console.log('📋 Testing listAgents (will auto-migrate if needed)...');
		const agents = await hybridService.listAgents();
		console.log(`   Found ${agents.length} agents`);

		if (agents.length > 0) {
			// Test 2: Get specific agent
			const firstAgent = agents[0];
			console.log(`\n🔍 Testing getAgentById for agent: ${firstAgent.id}`);
			const agent = await hybridService.getAgentById(firstAgent.id);
			console.log(`   Retrieved agent: ${agent?.hostname || 'null'}`);

			// Test 3: Update agent heartbeat
			console.log(`\n💓 Testing updateAgentHeartbeat for agent: ${firstAgent.id}`);
			await hybridService.updateAgentHeartbeat(firstAgent.id);
			console.log('   Heartbeat updated successfully');

			// Test 4: Get online agents
			console.log('\n🌐 Testing getOnlineAgents...');
			const onlineAgents = await hybridService.getOnlineAgents();
			console.log(`   Found ${onlineAgents.length} online agents`);

			// Test 5: Show agent details
			console.log('\n📊 Agent Details:');
			agents.forEach((agent, index) => {
				console.log(`   ${index + 1}. ${agent.hostname} (${agent.id})`);
				console.log(`      Status: ${agent.status}`);
				console.log(`      Platform: ${agent.platform}`);
				console.log(`      Version: ${agent.version}`);
				console.log(`      Last Seen: ${agent.lastSeen}`);
				console.log('');
			});
		} else {
			console.log('   No agents found. Migration may not have been necessary.');
		}

		console.log('✅ All agent tests completed successfully!');
	} catch (error) {
		console.error('❌ Agent test failed:', error);
		process.exit(1);
	}
}

// Run the test
testAgentMigration()
	.then(() => {
		console.log('\n🎉 Agent migration test completed!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Unexpected error:', error);
		process.exit(1);
	});
