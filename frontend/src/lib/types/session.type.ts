export type UserSession = {
	userId: string;
	username: string;
	createdAt: number;
	lastAccessed: number;
	expires?: number;
};
