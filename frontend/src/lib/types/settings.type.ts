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

export interface TemplateRegistryConfig {
	url: string;
	name: string;
	enabled: boolean;
	last_updated?: string;
	cache_ttl?: number;
}

export interface Settings {
	stacksDirectory: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	pruneMode: 'all' | 'dangling' | undefined;
	registryCredentials: RegistryCredential[];
	templateRegistries: TemplateRegistryConfig[];
	auth: AuthSettings;
	onboarding?: Onboarding;
	baseServerUrl?: string;
	maturityThresholdDays: number;
}

export interface OidcUserInfo {
	sub: string;
	email: string;
	name: string;
	preferred_username?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	groups?: string[];
}

export interface RegistryCredential {
	id: string;
	name: string;
	serverAddress: string;
	username: string;
	password: string; // This should be encrypted
	email?: string;
	isDefault?: boolean;
}

export interface TemplateRegistrySettings {
	id: string;
	name: string;
	url: string;
	username?: string;
	password?: string; // This should be encrypted
	enabled: boolean;
	autoUpdate: boolean;
	updateInterval: number; // in hours
}
