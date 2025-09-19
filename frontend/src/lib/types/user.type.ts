import type { Locale } from '$lib/paraglide/runtime';

export type User = {
	id: string;
	username: string;
	passwordHash?: string;
	displayName?: string;
	email?: string;
	roles: string[];
	createdAt: string;
	lastLogin?: string;
	updatedAt?: string;
	oidcSubjectId?: string;
	locale?: Locale;
};

export type CreateUser = Omit<
	User,
	'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'oidcSubjectId' | 'passwordHash' | 'requirePasswordChange' | 'roles'
> & {
	password: string;
	roles?: string[];
};
