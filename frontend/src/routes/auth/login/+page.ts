import { redirect } from '@sveltejs/kit';

// Get base path from build config
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export const load = async ({ parent, url }) => {
	const data = await parent();

	if (data.user) {
		throw redirect(302, `${basePath}/dashboard`);
	}

	const redirectTo = url.searchParams.get('redirect') || `${basePath}/dashboard`;

	const error = url.searchParams.get('error');

	return {
		settings: data.settings,
		redirectTo,
		error
	};
};
