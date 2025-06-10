import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Only perform logout on the client side
	if (browser) {
		try {
			// Call the Go backend logout endpoint
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Logout error:', error);
			// Continue with redirect even if logout fails
		}
	}

	// Redirect to login page
	throw redirect(302, '/auth/login');
};
