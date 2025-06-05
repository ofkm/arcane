import { listUsers, saveUser, hashPassword } from '$lib/services/user-service';

// First-run check to create admin user if needed
export async function checkFirstRun() {
	try {
		// getBasePath from settings-service should already handle dev vs prod
		const users = await listUsers();

		if (users.length === 0) {
			console.log('No users found. Creating default admin user...');

			// Create a default admin user
			const passwordHash = await hashPassword('arcane-admin'); // Default password

			await saveUser({
				id: crypto.randomUUID(),
				username: 'arcane',
				passwordHash,
				displayName: 'Arcane Admin',
				email: 'arcane@local',
				roles: ['admin'],
				createdAt: new Date().toISOString()
			});

			console.log('Default admin user created successfully');
			console.log('Username: arcane');
			console.log('Password: arcane-admin');
			console.log('IMPORTANT: Please change this password immediately after first login!');
		}
	} catch (error) {
		console.error('Error during first-run check:', error);
	}
}
