// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = async () => {
	throw redirect(302, '/auth/login');
};

export const actions = {
	default: async ({ locals }: import('./$types').RequestEvent) => {
		// Clear the session using the destroy method
		await locals.session.destroy();
		throw redirect(302, '/auth/login');
	}
};
;null as any as PageServerLoad;;null as any as Actions;