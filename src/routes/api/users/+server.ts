import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, hashPassword, saveUser, listUsers } from '$lib/services/user-service';
import type { User } from '$lib/types/user.type';
import { getSettings } from '$lib/services/settings-service';

// GET users endpoint
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Check authentication - only admins can list users
		if (!locals.user || !locals.user.roles.includes('admin')) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const users = await listUsers();

		// Remove sensitive data before sending
		const sanitizedUsers = users.map((user) => {
			const { passwordHash, ...rest } = user;
			return rest;
		});

		return json({ users: sanitizedUsers });
	} catch (error) {
		console.error('Error listing users:', error);
		return json({ error: 'Failed to list users' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Only admins should be able to create users
		const currentUser = locals.user as User;

		if (!currentUser || !currentUser.roles.includes('admin')) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const userData = await request.json();
		const { username, password, displayName, email, roles } = userData;

		// Validate input
		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		// Check if username already exists
		const existingUser = await getUserByUsername(username);

		if (existingUser) {
			return json({ error: 'Username already exists' }, { status: 409 });
		}

		// Get password policy from settings
		const settings = await getSettings();
		const policy = settings.auth?.passwordPolicy || 'medium';

		// Validate password according to policy
		if (!validatePassword(password, policy)) {
			return json({ error: 'Password does not meet requirements' }, { status: 400 });
		}

		// Create the user
		const passwordHash = await hashPassword(password);

		const newUser: User = {
			id: '', // Will be generated in saveUser
			username,
			passwordHash,
			displayName: displayName || username,
			email,
			roles: roles || ['user'],
			createdAt: new Date().toISOString()
		};

		const savedUser = await saveUser(newUser);

		// Return sanitized user (remove sensitive fields)
		const { passwordHash: _, ...sanitizedUser } = savedUser;

		return json({
			success: true,
			user: sanitizedUser
		});
	} catch (error) {
		console.error('Error creating user:', error);
		return json({ error: 'Failed to create user' }, { status: 500 });
	}
};

// Validate password based on policy
function validatePassword(password: string, policy: 'low' | 'medium' | 'high'): boolean {
	switch (policy) {
		case 'low':
			return password.length >= 8;
		case 'medium':
			return password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password);
		case 'high':
			return password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
		default:
			return true;
	}
}
