export interface SettingsData {
  dockerHost: string;
  autoUpdate: boolean;
  pollingInterval: number;
  stacksDirectory: string;
  registryCredentials?: Array<{
    url: string;
    username: string;
    password: string;
  }>;
  valkeyConfig?: {
    enabled: boolean;
    host: string;
    port: number;
    username?: string;
    password?: string;
    keyPrefix: string;
  };
}
