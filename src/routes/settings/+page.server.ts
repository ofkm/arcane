import type { PageServerLoad } from './$types';
import { getSettings } from '$lib/services/settings-service';
import { listUsers } from '$lib/services/user-service';

export const load: PageServerLoad = async () => {
	const settings = await getSettings();
	const users = await listUsers();

	const csrf = crypto.randomUUID();

	const sanitizedUsers = users.map((user) => {
		const { passwordHash: _passwordHash, ...rest } = user;
		return rest;
	});

	return {
		settings,
		csrf,
		users: sanitizedUsers
	};
};
