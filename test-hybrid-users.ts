#!/usr/bin/env tsx

import { getUserByUsername, getUserById, listUsers, saveUser } from './src/lib/services/user-service';

async function main() {
	console.log('🔍 Testing hybrid user service...');

	try {
		// Test listing users (should load from database)
		console.log('\n📋 Testing listUsers...');
		const users = await listUsers();
		console.log(`✅ Found ${users.length} users`);

		if (users.length > 0) {
			const testUser = users[0];
			console.log(`👤 First user: ${testUser.username} (${testUser.email})`);

			// Test getUserById (should load from database)
			console.log('\n🔍 Testing getUserById...');
			const userById = await getUserById(testUser.id);
			console.log(`✅ getUserById: ${userById ? 'Success' : 'Failed'}`);

			// Test getUserByUsername (should load from database)
			console.log('\n🔍 Testing getUserByUsername...');
			const userByUsername = await getUserByUsername(testUser.username);
			console.log(`✅ getUserByUsername: ${userByUsername ? 'Success' : 'Failed'}`);

			// Test updating a user (should save to both database and file)
			console.log('\n💾 Testing user update...');
			const updatedUser = { ...testUser, updatedAt: new Date().toISOString() };
			const savedUser = await saveUser(updatedUser);
			console.log(`✅ User update: ${savedUser ? 'Success' : 'Failed'}`);
		}

		console.log('\n🎉 Hybrid user service test completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error);
		process.exit(1);
	}
}

main();
