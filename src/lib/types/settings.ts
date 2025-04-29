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
	externalServices: {
		valkey?: {
			enabled: boolean;
			host: string;
			port: number;
			username?: string;
			password?: string;
			keyPrefix: string;
		};
	};
	auth?: {
		localAuthEnabled: boolean;
		oidcEnabled: boolean;
		ldapEnabled: boolean;
		sessionTimeout: number;
		passwordPolicy: 'low' | 'medium' | 'high';
		require2fa: boolean;
		allowTotp: boolean;
		rbacEnabled: boolean;
	};
}
