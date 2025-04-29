export type User = {
	id: string;
	username: string;
	passwordHash: string;
	displayName?: string;
	email?: string;
	roles: string[];
	mfaEnabled: boolean;
	mfaSecret?: string;
	createdAt: string;
	lastLogin?: string;
	requirePasswordChange?: boolean;
};
