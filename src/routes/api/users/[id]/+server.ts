import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, saveUser, hashPassword } from '$lib/services/user-service';
import { deleteUserFromDb } from '$lib/services/database/user-db-service';
import type { User } from '$lib/types/user.type';
import { getSettings } from '$lib/services/settings-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		const userId = params.id;
		if (!userId) {
			return json({ success: false, error: 'User ID is required' }, { status: 400 });
		}

		const bodyResult = await tryCatch(request.json());
		if (bodyResult.error) {
			return json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
		}

		const { username, displayName, email, roles, password } = bodyResult.data;

		// Get existing user
		const existingUser = await getUserById(userId);
		if (!existingUser) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Create updated user object
		const updatedUser: User = {
			...existingUser,
			...(username !== undefined && { username }),
			...(displayName !== undefined && { displayName }),
			...(email !== undefined && { email }),
			...(roles !== undefined && { roles }),
			updatedAt: new Date().toISOString()
		};

		// Handle password update if provided
		if (password) {
			updatedUser.passwordHash = await hashPassword(password);
		}

		// Save the updated user
		await saveUser(updatedUser);

		// Return success response
		return json({
			success: true,
			user: {
				...updatedUser,
				passwordHash: undefined
			}
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ success: false, error: 'Failed to update user' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !locals.user.roles.includes('admin')) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Unauthorized',
			code: ApiErrorCode.FORBIDDEN
		};
		return json(response, { status: 403 });
	}

	const userId = params.id;

	if (userId === locals.user.id) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Cannot delete your own account',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	try {
		// Check if user exists in database
		const existingUser = await getUserById(userId);
		if (!existingUser) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'User not found',
				code: ApiErrorCode.NOT_FOUND
			};
			return json(response, { status: 404 });
		}

		// Delete user from database
		const deleteResult = await tryCatch(deleteUserFromDb(userId));
		if (deleteResult.error) {
			console.error('Error deleting user from database:', deleteResult.error);
			const response: ApiErrorResponse = {
				success: false,
				error: 'Failed to delete user',
				code: ApiErrorCode.INTERNAL_SERVER_ERROR,
				details: deleteResult.error
			};
			return json(response, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting user:', error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to delete user',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: error
		};
		return json(response, { status: 500 });
	}
};
