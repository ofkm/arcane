import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ locals }) => {
	await locals.session.destroy();
	throw redirect(302, '/auth/login');
};
