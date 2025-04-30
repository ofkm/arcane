import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getSettings, saveSettings } from '$lib/services/settings-service';
import type { SettingsData } from '$lib/types/settings.type';
import { listUsers, saveUser, getUserById, hashPassword } from '$lib/services/user-service';

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await getSettings();
	const users = await listUsers();

	const csrf = crypto.randomUUID();

	// Remove sensitive data before sending to client
	const sanitizedUsers = users.map((user) => {
		const { passwordHash, mfaSecret, ...rest } = user;
		return rest;
	});

	return {
		settings,
		csrf,
		users: sanitizedUsers
	};
};
