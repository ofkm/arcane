export interface SettingsData {
  dockerHost: string;
  autoUpdate: boolean;
  pollingEnabled: boolean;
  pollingInterval: number;
  stacksDirectory: string;
  pruneMode: "all" | "dangling";
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
    // Other services can be added here in the future
  };
}
