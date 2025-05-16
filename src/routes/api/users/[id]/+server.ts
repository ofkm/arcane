import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserById, saveUser, hashPassword } from '$lib/services/user-service';
import type { User } from '$lib/types/user.type';
import { getSettings } from '$lib/services/settings-service';
import fs from 'fs/promises';
import path from 'node:path';
import { BASE_PATH } from '$lib/services/paths-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

const USER_DIR = path.join(BASE_PATH, 'users');

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Unauthorized',
			code: ApiErrorCode.UNAUTHORIZED
		};
		return json(response, { status: 401 });
	}

	const userIdToUpdate = params.id;
	const requestingUser = locals.user as User;

	if (!requestingUser.roles.includes('admin') && requestingUser.id !== userIdToUpdate) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Forbidden',
			code: ApiErrorCode.FORBIDDEN
		};
		return json(response, { status: 403 });
	}

	const existingUserResult = await tryCatch(getUserById(userIdToUpdate));
	if (existingUserResult.error || !existingUserResult.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'User not found',
			code: ApiErrorCode.NOT_FOUND
		};
		return json(response, { status: 404 });
	}
	const existingUser = existingUserResult.data;

	const updateDataResult = await tryCatch(request.json());
	if (updateDataResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const { password, displayName, email, roles } = updateDataResult.data;

	const updatedUser: User = { ...existingUser };

	if (displayName !== undefined) updatedUser.displayName = displayName;
	if (email !== undefined) updatedUser.email = email;
	if (roles !== undefined && requestingUser.roles.includes('admin')) {
		const ALLOWED = ['admin', 'user', 'viewer'];
		updatedUser.roles = Array.isArray(roles) ? roles.filter((r) => ALLOWED.includes(r)) : updatedUser.roles;
	}

	if (password) {
		const hashResult = await tryCatch(hashPassword(password));
		if (hashResult.error) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'Failed to hash password',
				code: ApiErrorCode.INTERNAL_SERVER_ERROR,
				details: hashResult.error
			};
			return json(response, { status: 500 });
		}
		updatedUser.passwordHash = hashResult.data;
		updatedUser.requirePasswordChange = false;
	}

	const saveResult = await tryCatch(saveUser(updatedUser));
	if (saveResult.error) {
		console.error('Error saving user:', saveResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to update user',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: saveResult.error
		};
		return json(response, { status: 500 });
	}

	const { passwordHash: _unused, ...sanitizedUser } = saveResult.data;
	return json({ success: true, user: sanitizedUser });
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

	const userFile = path.join(USER_DIR, `${userId}.dat`);

	const accessResult = await tryCatch(fs.access(userFile));
	if (accessResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'User not found',
			code: ApiErrorCode.NOT_FOUND
		};
		return json(response, { status: 404 });
	}

	const unlinkResult = await tryCatch(fs.unlink(userFile));
	if (unlinkResult.error) {
		console.error('Error deleting user:', unlinkResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to delete user',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: unlinkResult.error
		};
		return json(response, { status: 500 });
	}

	return json({ success: true });
};
