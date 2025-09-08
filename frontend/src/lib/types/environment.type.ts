export type EnvironmentStatus = 'online' | 'offline' | 'error';

export interface Environment {
	id: string;
	apiUrl: string;
	status: EnvironmentStatus;
	enabled: boolean;
	lastSeen?: string;
	createdAt: string;
	updatedAt?: string;
	isLocal?: boolean;
}

export interface CreateEnvironmentDTO {
	apiUrl: string;
	bootstrapToken: string;
}

export interface UpdateEnvironmentDTO {
	apiUrl?: string;
	enabled?: boolean;
	bootstrapToken?: string;
}

export interface EnvironmentResponse {
	data: Environment;
	success: boolean;
	message?: string;
}
