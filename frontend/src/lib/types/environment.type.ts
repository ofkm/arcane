import type { Environment } from '$lib/stores/environment.store';

export interface CreateEnvironmentDTO {
	hostname: string;
	apiUrl: string;
	description?: string;
}

export interface UpdateEnvironmentDTO {
	hostname?: string;
	apiUrl?: string;
	description?: string;
}

export interface EnvironmentResponse {
	data: Environment;
	success: boolean;
	message?: string;
}

export interface EnvironmentsListResponse<T = Environment> {
	data: T[];
	success: boolean;
	pagination?: {
		totalPages: number;
		totalItems: number;
		currentPage: number;
		itemsPerPage: number;
	};
}
