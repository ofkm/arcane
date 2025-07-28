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
}

export interface OidcStatusInfo {
	envForced: boolean;
	envConfigured: boolean;
	dbEnabled: boolean;
	dbConfigured: boolean;
	effectivelyEnabled: boolean;
	effectivelyConfigured: boolean;
}

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

export interface Onboarding {
	completed: boolean;
	completedAt?: number;
	steps?: {
		welcome?: boolean;
		password?: boolean;
		docker?: boolean;
		security?: boolean;
		settings?: boolean;
	};
}

export interface Settings {
	id: number;
	dockerTLSCert: string;
	stacksDirectory: string;
	autoUpdate: boolean;
	autoUpdateInterval: number;
	pollingEnabled: boolean;
	pollingInterval: number;
	pruneMode?: string;
	registryCredentials: RegistryCredential[];
	templateRegistries: TemplateRegistryConfig[];
	auth: AuthSettings;
	onboarding?: Onboarding;
	baseServerUrl?: string;
	createdAt: string;
	updatedAt: string;
}
