import type { PageLoad } from './$types';
import { environmentManagementAPI } from '$lib/services/api';

export const load: PageLoad = async ({ params }) => {
	const environment = await environmentManagementAPI.get(params.id);

	return {
		environment
	};
};
