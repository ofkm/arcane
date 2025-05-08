export interface AuthSettings {
	localAuthEnabled: boolean;
	sessionTimeout: number;
	passwordPolicy: 'basic' | 'standard' | 'strong';
	rbacEnabled: boolean;
}

export interface RegistryCredential {
	url: string;
	username: string;
	password: string;
}

export interface Onboarding {
	completed?: boolean;
	completedAt?: string;
}

export interface Settings {
	dockerHost: string;
	stacksDirectory: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	pruneMode: 'all' | 'dangling';
	registryCredentials: RegistryCredential[];
	auth: AuthSettings;
	onboarding?: Onboarding;
	baseServerUrl?: string;
}
