import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';
import { getBasePath } from '$lib/services/settings-service';

// Get USER_DIR from base path
const USER_DIR = path.join(getBasePath(), 'users');

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

		const userFile = path.join(USER_DIR, `${userId}.json`);

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
