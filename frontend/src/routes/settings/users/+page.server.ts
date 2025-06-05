import type { PageServerLoad } from './$types';
import UserAPIService from '$lib/services/api/user-api-service';
import { listUsers } from '$lib/services/user-service';

export const load: PageServerLoad = async ({ cookies }) => {
	try {
		const userApi = new UserAPIService();

		const users = await listUsers();

		const sanitizedUsers = users.map((user) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { passwordHash: _passwordHash, ...rest } = user;
			return rest;
		});

		return {
			users: users || []
		};
	} catch (error) {
		console.error('Failed to load users:', error);
		return {
			users: []
		};
	}
};
