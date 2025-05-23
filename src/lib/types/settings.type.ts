export interface AuthSettings {
	localAuthEnabled: boolean;
	oidcEnabled: boolean;
	sessionTimeout: number;
	passwordPolicy: 'basic' | 'standard' | 'strong';
	rbacEnabled: boolean;
	oidc?: OidcConfig;
}

export interface RegistryCredential {
	url: string;
	username: string;
	password: string;
}

export interface OidcConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	userinfoEndpoint: string;
	scopes: string;
}

export interface Onboarding {
	completed: boolean;
	completedAt?: string;
	steps?: {
		welcome?: boolean;
		password?: boolean;
		settings?: boolean;
	};
}

export interface Settings {
	dockerHost: string;
	stacksDirectory: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	pruneMode: 'all' | 'dangling' | undefined;
	registryCredentials: RegistryCredential[];
	auth: AuthSettings;
	onboarding?: Onboarding;
	baseServerUrl?: string;
	maturityThresholdDays: number;
}
