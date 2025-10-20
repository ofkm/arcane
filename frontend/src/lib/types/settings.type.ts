import type { TemplateRegistryConfig } from './template.type';

export type SettingRawResponse = {
	key: string;
	type: string;
	value: string;
	isPublic?: boolean;
}[];

export type Settings = {
	projectsDirectory: string;
	diskUsagePath: string;
	autoUpdate: boolean;
	pollingEnabled: boolean;
	updateScheduleEnabled: boolean;
	updateScheduleWindows: UpdateScheduleWindow[];
	pollingInterval: number;
	dockerPruneMode: 'all' | 'dangling';
	baseServerUrl: string;
	enableGravatar: boolean;
	uiConfigDisabled: boolean;
	defaultShell: string;
	dockerHost: string;
	accentColor: string;

	authLocalEnabled: boolean;
	authOidcEnabled: boolean;
	authSessionTimeout: number;
	authPasswordPolicy: 'basic' | 'standard' | 'strong';
	authOidcConfig: string;

	onboardingCompleted: boolean;
	onboardingSteps: {
		welcome?: boolean;
		password?: boolean;
		docker?: boolean;
		security?: boolean;
		settings?: boolean;
	};

	mobileNavigationMode: 'floating' | 'docked';
	mobileNavigationShowLabels: boolean;
	mobileNavigationScrollToHide: boolean;
	sidebarHoverExpansion: boolean;

	glassEffectEnabled: boolean;

	registryCredentials: RegistryCredential[];
	templateRegistries: TemplateRegistryConfig[];
};

export interface RegistryCredential {
	url: string;
	username: string;
	password: string;
}

export interface OidcConfig {
	clientId: string;
	clientSecret?: string;
	issuerUrl: string;
	scopes: string;

	adminClaim?: string; // e.g., "roles", "groups", "realm_access.roles", "admin"
	adminValue?: string; // e.g., "admin" (comma-separated accepted values)
}

export interface OidcStatusInfo {
	envForced: boolean;
	envConfigured: boolean;
}

export interface UpdateScheduleWindow {
	days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
	startTime: string; // e.g., "02:00"
	endTime: string; // e.g., "06:00"
	timezone: string; // e.g., "UTC"
}
