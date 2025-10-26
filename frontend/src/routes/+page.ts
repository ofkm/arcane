import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Get base path from build config
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export const load: PageLoad = async () => {
	return redirect(302, `${basePath}/auth/login`);
};
