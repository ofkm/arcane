export interface AppVersionInformation {
	currentVersion: string;
	newestVersion?: string;
	updateAvailable?: boolean;
	releaseUrl?: string;
	releaseNotes?: string;
}

export interface AppConfig {
	version: string;
	buildDate: string;
	environment: 'development' | 'production' | 'test';
	features: FeatureFlags;
	limits: AppLimits;
	defaultSettings: DefaultAppSettings;
}

export interface FeatureFlags {
	oidcEnabled: boolean;
	rbacEnabled: boolean;
	templatesEnabled: boolean;
	registriesEnabled: boolean;
	pruningEnabled: boolean;
	loggingEnabled: boolean;
	metricsEnabled: boolean;
}

export interface AppLimits {
	maxContainers: number;
	maxImages: number;
	maxVolumes: number;
	maxNetworks: number;
	maxStacks: number;
	maxUsers: number;
	sessionTimeout: number;
	fileUploadMaxSize: number;
}

export interface DefaultAppSettings {
	theme: 'light' | 'dark' | 'auto';
	language: string;
	timezone: string;
	dateFormat: string;
	timeFormat: string;
}
