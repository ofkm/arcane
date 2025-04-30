import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, saveUser, hashPassword } from '$lib/services/user-service';
import type { User } from '$lib/types/user.type';
import { getSettings } from '$lib/services/settings-service';
import fs from 'fs/promises';
import path from 'node:path';
import { BASE_PATH } from '$lib/services/paths-service';

// Get USER_DIR from base path
const USER_DIR = path.join(BASE_PATH, 'users');

// PUT endpoint for updating a user
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Only admins or the user themselves can update
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userIdToUpdate = params.id;
		const requestingUser = locals.user as User;

		// Check if user is admin or updating their own profile
		if (!requestingUser.roles.includes('admin') && requestingUser.id !== userIdToUpdate) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const existingUser = await getUserById(userIdToUpdate);
		if (!existingUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const updateData = await request.json();
		const { password, displayName, email, roles } = updateData;

		// Prepare updated user object
		const updatedUser: User = { ...existingUser };

		if (displayName !== undefined) updatedUser.displayName = displayName;
		if (email !== undefined) updatedUser.email = email;
		if (roles !== undefined && requestingUser.roles.includes('admin')) {
			// Only admins can change roles
			const ALLOWED = ['admin', 'user', 'viewer'];
			updatedUser.roles = Array.isArray(roles) ? roles.filter((r) => ALLOWED.includes(r)) : updatedUser.roles;
		}

		// Handle password change
		if (password) {
			// Get password policy from settings
			const settings = await getSettings();
			const policy = settings.auth?.passwordPolicy || 'medium';

			// Validate password according to policy
			// if (!validatePassword(password, policy)) {
			// 	return json({ error: 'Password does not meet requirements' }, { status: 400 });
			// }
			updatedUser.passwordHash = await hashPassword(password);
			updatedUser.requirePasswordChange = false; // Reset flag if password is changed
		}

		const savedUser = await saveUser(updatedUser);

		// Return sanitized user
		const { passwordHash: _, ...sanitizedUser } = savedUser;
		return json({ success: true, user: sanitizedUser });
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ error: 'Failed to update user' }, { status: 500 });
	}
};

// DELETE endpoint
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Only admins should be able to delete users
		if (!locals.user || !locals.user.roles.includes('admin')) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		const userId = params.id;

		// Don't allow deleting yourself
		if (userId === locals.user.id) {
			return json({ error: 'Cannot delete your own account' }, { status: 400 });
		}

		const userFile = path.join(USER_DIR, `${userId}.dat`);

		try {
			await fs.access(userFile);
		} catch {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Delete the user file
		await fs.unlink(userFile);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting user:', error);
		return json({ error: 'Failed to delete user' }, { status: 500 });
	}
};
