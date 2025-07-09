import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	if (browser) {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

	// Redirect to login page
	throw redirect(302, '/auth/login');
};
