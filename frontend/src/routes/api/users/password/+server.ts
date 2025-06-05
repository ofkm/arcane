import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, saveUser } from '$lib/services/user-service';
import { verifyPassword, hashPassword } from '$lib/services/user-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ request, locals }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Not authenticated',
			code: ApiErrorCode.UNAUTHORIZED
		};
		return json(response, { status: 401 });
	}

	const bodyResult = await tryCatch(request.json());
	if (bodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const { currentPassword, newPassword } = bodyResult.data;

	if (!currentPassword || !newPassword) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Both current and new passwords are required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const userResult = await tryCatch(getUserByUsername(currentUser.username));
	if (userResult.error || !userResult.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'User not found',
			code: ApiErrorCode.NOT_FOUND
		};
		return json(response, { status: 404 });
	}
	const user = userResult.data;

	const verifyResult = await tryCatch(verifyPassword(user, currentPassword));
	if (verifyResult.error || !verifyResult.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Current password is incorrect',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const hashResult = await tryCatch(hashPassword(newPassword));
	if (hashResult.error) {
		console.error('Error hashing new password:', hashResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to hash new password',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: hashResult.error
		};
		return json(response, { status: 500 });
	}

	const saveResult = await tryCatch(
		saveUser({
			...user,
			passwordHash: hashResult.data,
			updatedAt: new Date().toISOString()
		})
	);
	if (saveResult.error) {
		console.error('Error saving user with new password:', saveResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to change password',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: saveResult.error
		};
		return json(response, { status: 500 });
	}

	return json({ success: true });
};
