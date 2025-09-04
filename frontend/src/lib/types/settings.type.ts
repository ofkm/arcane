export type SettingRawResponse = {
	key: string;
	type: string;
	value: string;
	isPublic?: boolean;
}[];

export type Settings = {
	stacksDirectory: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	dockerPruneMode: 'all' | 'dangling';
	baseServerUrl: string;

	authLocalEnabled: boolean;
	authOidcEnabled: boolean;
	authSessionTimeout: number;
	authPasswordPolicy: 'basic' | 'standard' | 'strong';
	authRbacEnabled: boolean;
	authOidcConfig: string;

	onboardingCompleted: boolean;
	onboardingSteps: {
		welcome?: boolean;
		password?: boolean;
		docker?: boolean;
		security?: boolean;
		settings?: boolean;
	};

	registryCredentials: RegistryCredential[];
	templateRegistries: TemplateRegistryConfig[];
};

export interface RegistryCredential {
	url: string;
	username: string;
	password: string;
}

export interface TemplateRegistryConfig {
	url: string;
	name: string;
	enabled: boolean;
	lastUpdated?: number;
	cacheTtl?: number;
}

export interface AuthSettings {
	localAuthEnabled: boolean;
	oidcEnabled: boolean;
	sessionTimeout: number;
	passwordPolicy: string;
	rbacEnabled: boolean;
	oidc?: OidcConfig;
}

export interface OidcConfig {
	clientId: string;
	clientSecret?: string;
	issuerUrl: string;
	scopes: string;
	// Optional OIDC discovery endpoints (from backend)
	authorizationEndpoint?: string;
	tokenEndpoint?: string;
	userinfoEndpoint?: string;
	jwksUri?: string;
}

export interface OidcStatusInfo {
	envForced: boolean;
	envConfigured: boolean;
	dbEnabled: boolean;
	dbConfigured: boolean;
	effectivelyEnabled: boolean;
	effectivelyConfigured: boolean;
}
