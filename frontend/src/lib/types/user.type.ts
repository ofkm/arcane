export type User = {
	id: string;
	username: string;
	passwordHash?: string;
	displayName?: string;
	email?: string;
	roles: string[];
	createdAt: string;
	lastLogin?: string;
	requirePasswordChange?: boolean;
	updatedAt?: string;
	oidcSubjectId?: string;
};
