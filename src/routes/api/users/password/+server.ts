import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, saveUser } from '$lib/services/user-service';
import { verifyPassword, hashPassword } from '$lib/services/user-service';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const currentUser = locals.user;

		if (!currentUser) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const { currentPassword, newPassword } = await request.json();

		if (!currentPassword || !newPassword) {
			return json({ error: 'Both current and new passwords are required' }, { status: 400 });
		}

		// Get fresh user data
		const user = await getUserByUsername(currentUser.username);

		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Verify current password
		const validPassword = await verifyPassword(user, currentPassword);

		if (!validPassword) {
			return json({ error: 'Current password is incorrect' }, { status: 400 });
		}

		// Hash new password
		const passwordHash = await hashPassword(newPassword);

		// Update user with new password hash
		await saveUser({
			...user,
			passwordHash,
			updatedAt: new Date().toISOString()
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error changing password:', error);
		return json({ error: 'Failed to change password' }, { status: 500 });
	}
};
