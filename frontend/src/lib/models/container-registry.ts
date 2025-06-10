export interface ContainerRegistry {
	id?: string;
	url: string;
	username: string;
	token: string;
	description?: string;
	insecure?: boolean;
	enabled?: boolean;
	createdAt?: string;
	updatedAt?: string;
}
