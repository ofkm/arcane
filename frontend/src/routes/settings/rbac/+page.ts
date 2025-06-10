import type { PageLoad } from './$types';
import { settingsAPI, userAPI } from '$lib/services/api';

export const load: PageLoad = async () => {
	try {
		const [settings, users, roles] = await Promise.all([
			settingsAPI.getSettings(),
			userAPI.list().catch(() => []),
			userAPI.getRoles().catch(() => [])
		]);

		return {
			settings,
			users,
			roles
		};
	} catch (error) {
		console.error('Failed to load RBAC settings:', error);
		return {
			settings: {
				auth: {
					rbacEnabled: false
				}
			},
			users: [],
			roles: []
		};
	}
};
