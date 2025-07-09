import { settingsAPI, userAPI } from '$lib/services/api';
import type { SearchPaginationSortRequest } from '$lib/types/pagination.type';


export const load = async () => {
	const settings = await settingsAPI.getSettings();

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

    const users = await userAPI.getUsers(
        userRequestOptions.pagination,
        userRequestOptions.sort,
        userRequestOptions.search,
        userRequestOptions.filters
    );

	return {
		settings,
		users,
		userRequestOptions
	};
};
