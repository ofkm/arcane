#!/usr/bin/env tsx

import { databaseUserService } from './src/lib/services/database-user-service';

async function main() {
	try {
		const users = await databaseUserService.listUsers();
		console.log('Raw users from database:', JSON.stringify(users, null, 2));

		if (users.length > 0) {
			const firstUser = users[0];
			console.log('\nFirst user details:');
			console.log('ID:', firstUser.id);
			console.log('Username:', firstUser.username);
			console.log('Email:', firstUser.email);
			console.log('Roles:', firstUser.roles);

			// Test specific queries
			const userById = await databaseUserService.getUserById(firstUser.id);
			console.log('\ngetUserById result:', userById ? 'Found' : 'Not found');

			const userByUsername = await databaseUserService.getUserByUsername(firstUser.username);
			console.log('getUserByUsername result:', userByUsername ? 'Found' : 'Not found');
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

main();
