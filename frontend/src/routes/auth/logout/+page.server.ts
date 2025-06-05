import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/auth/login');
};

export const actions: Actions = {
	default: async ({ locals }) => {
		// Clear the session using the destroy method
		await locals.session.destroy();
		throw redirect(302, '/auth/login');
	}
};
