import { settingsService } from '$lib/services/settings-service';
import { userService } from '$lib/services/user-service';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';

export const load = async () => {
	const settings = await settingsService.getSettings();

	const userRequestOptions: SearchPaginationSortRequest = {
		pagination: {
			page: 1,
			limit: 20
		},
		sort: {
			column: 'Username',
			direction: 'asc' as const
		}
	};

	const users = await userService.getUsers(userRequestOptions);

	return {
		settings,
		users,
		userRequestOptions
	};
};
