export interface SettingsData {
	dockerHost: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	stacksDirectory: string;
	pruneMode: 'all' | 'dangling';
	registryCredentials?: Array<{
		url: string;
		username: string;
		password: string;
	}>;
	externalServices?: {};
	auth?: {
		localAuthEnabled: boolean;
		sessionTimeout: number;
		passwordPolicy: 'low' | 'medium' | 'high';
		rbacEnabled: boolean;
	};
}

export interface AuthSettings {
	localAuthEnabled: boolean;
	sessionTimeout: number;
	passwordPolicy: 'low' | 'medium' | 'high';
	rbacEnabled: boolean;
}

export interface RegistryCredential {
	url: string;
	username: string;
	password: string;
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
}
