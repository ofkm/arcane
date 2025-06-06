import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ parent, url }) => {
	const data = await parent();

	// If already authenticated, redirect to dashboard
	if (data.user && data.isAuthenticated) {
		throw redirect(302, '/');
	}

	// Get redirect parameter from URL
	const redirectTo = url.searchParams.get('redirect') || '/';

	// Get error parameter if any
	const error = url.searchParams.get('error');

	return {
		settings: data.settings,
		redirectTo,
		error
	};
};
