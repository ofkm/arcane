export interface ContainerRegistryCreateDto {
	url: string;
	username: string;
	token: string;
	description?: string;
	insecure?: boolean;
	enabled?: boolean;
}

export interface ContainerRegistryUpdateDto {
	url?: string;
	username?: string;
	token?: string;
	description?: string;
	insecure?: boolean;
	enabled?: boolean;
}

export interface ContainerRegistry {
	id: string;
	url: string;
	username: string;
	token: string;
	description?: string;
	insecure?: boolean;
	enabled?: boolean;
	createdAt?: string;
	updatedAt?: string;
}
