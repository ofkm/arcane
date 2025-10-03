import type { PageLoad } from './$types';
import { globalVariablesService } from '$lib/services/variable-service';

export const load: PageLoad = async () => {
	try {
		const variables = await globalVariablesService.getGlobalVariables();
		return {
			variables
		};
	} catch (error) {
		console.error('Failed to load global variables:', error);
		return {
			variables: []
		};
	}
};

