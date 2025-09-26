import { projectService } from '$lib/services/project-service';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const projectRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'name',
			direction: 'asc' as const
		}
	};

	const projects = await projectService.getProjects(projectRequestOptions);
	const projectStatusCounts = await projectService.getProjectStatusCounts();

	return { projects, projectRequestOptions, projectStatusCounts };
};
