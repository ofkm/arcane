import type { Environment } from '$lib/stores/environment.store';

export interface CreateEnvironmentDTO {
	apiUrl: string;
	accessToken?: string;
	bootstrapToken?: string;
}

export interface UpdateEnvironmentDTO {
	apiUrl?: string;
	enabled?: boolean;
	accessToken?: string;
	bootstrapToken?: string;
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
