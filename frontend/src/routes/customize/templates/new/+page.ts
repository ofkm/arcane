import type { PageLoad } from './$types';
import { templateService } from '$lib/services/template-service';

export const load: PageLoad = async () => {
	const templates = await templateService.getAllTemplates();

	return {
		templates
	};
};
