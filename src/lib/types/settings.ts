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
