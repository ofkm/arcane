import { environmentManagementService } from '$lib/services/env-mgmt-service';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const environment = await environmentManagementService.get(params.id);

	return {
		environment
	};
};
