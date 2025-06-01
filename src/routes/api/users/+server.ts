import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByUsername, hashPassword, saveUser, listUsers } from '$lib/services/user-service';
import type { User } from '$lib/types/user.type';
import { getSettings } from '$lib/services/settings-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';
import { nanoid } from 'nanoid'; // Add this import

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.user.roles.includes('admin')) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Unauthorized',
			code: ApiErrorCode.FORBIDDEN
		};
		return json(response, { status: 403 });
	}

	const usersResult = await tryCatch(listUsers());
	if (usersResult.error) {
		console.error('Error listing users:', usersResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to list users',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: usersResult.error
		};
		return json(response, { status: 500 });
	}

	const sanitizedUsers = usersResult.data.map((user: User) => {
		const { passwordHash, ...rest } = user;
		return rest;
	});

	return json({ success: true, users: sanitizedUsers });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const currentUser = locals.user as User;

	if (!currentUser || !currentUser.roles.includes('admin')) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Unauthorized',
			code: ApiErrorCode.FORBIDDEN
		};
		return json(response, { status: 403 });
	}

	const userDataResult = await tryCatch(request.json());
	if (userDataResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const { username, password, displayName, email, roles } = userDataResult.data;

	if (!username || !password) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Username and password are required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const existingUserResult = await tryCatch(getUserByUsername(username));
	if (existingUserResult.data) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Username already exists',
			code: ApiErrorCode.CONFLICT
		};
		return json(response, { status: 409 });
	}

	const settingsResult = await tryCatch(getSettings());
	const settings = settingsResult.data;
	const policy = settings?.auth?.passwordPolicy || 'strong';

	if (!validatePassword(password, policy)) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Password does not meet requirements',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const hashResult = await tryCatch(hashPassword(password));
	if (hashResult.error) {
		console.error('Error hashing password:', hashResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to hash password',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: hashResult.error
		};
		return json(response, { status: 500 });
	}

	const newUser: User = {
		id: nanoid(), // Generate a unique ID
		username,
		passwordHash: hashResult.data,
		displayName: displayName || username,
		email,
		roles: roles || ['user'],
		createdAt: new Date().toISOString()
	};

	const saveResult = await tryCatch(saveUser(newUser));
	if (saveResult.error) {
		console.error('Error saving user:', saveResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to create user',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: saveResult.error
		};
		return json(response, { status: 500 });
	}

	const { passwordHash: _unused, ...sanitizedUser } = saveResult.data;

	return json({
		success: true,
		user: sanitizedUser
	});
};

function validatePassword(password: string, policy: 'basic' | 'standard' | 'strong'): boolean {
	switch (policy) {
		case 'basic':
			return password.length >= 8;
		case 'standard':
			return password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password);
		case 'strong':
			return password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
		default:
			return true;
	}
}
