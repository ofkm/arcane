import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export const load: PageLoad = async ({ fetch }) => {
	try {
		await fetch(`${basePath}/api/auth/logout`, {
			method: 'POST',
			credentials: 'include'
		});
	} catch (error) {
		console.error('Logout error:', error);
	}

	throw redirect(302, `${basePath}/auth/login`);
};
