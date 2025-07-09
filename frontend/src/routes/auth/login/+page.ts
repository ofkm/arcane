import { redirect } from '@sveltejs/kit';

export const load = async ({ parent, url }) => {
	const data = await parent();

	// If already authenticated, redirect to dashboard
	if (data.user && data.isAuthenticated) {
		throw redirect(302, '/dashboard');
	}

	// Get redirect parameter from URL
	const redirectTo = url.searchParams.get('redirect') || '/dashboard';

	// Get error parameter if any
	const error = url.searchParams.get('error');

	return {
		settings: data.settings,
		redirectTo,
		error
	};
};
