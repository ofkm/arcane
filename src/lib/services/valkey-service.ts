import { createClient, type RedisClientType } from "redis";
import { getSettings } from "./settings-service";

let client: RedisClientType | null = null;
let isConnected = false;

type ValKeyConfig = {
  host: string;
  port: number;
  password?: string;
  username?: string;
};

const DEFAULT_CONFIG: ValKeyConfig = {
  host: "localhost",
  port: 6379,
};

/**
 * Initialize the Valkey client connection
 */
export async function initValKeyClient(
  config: ValKeyConfig = DEFAULT_CONFIG
): Promise<void> {
  try {
    // Close any existing connection
    if (client) {
      await client.quit();
      isConnected = false;
    }

    // Create connection URL
    const url = `redis://${
      config.username ? `${config.username}:${config.password}@` : ""
    }${config.host}:${config.port}`;

    client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries: number): number =>
          Math.min(retries * 50, 1000),
      },
    });

    client.on("error", (err: Error) => {
      console.error("Valkey/Redis Client Error:", err);
      isConnected = false;
    });

    client.on("connect", () => {
      console.log("Connected to Valkey/Redis server");
      isConnected = true;
    });

    await client.connect();
  } catch (error) {
    console.error("Failed to initialize Valkey connection:", error);
    isConnected = false;
  }
}

/**
 * Initialize Valkey client based on application settings
 */
export async function initValKeyFromSettings(): Promise<boolean> {
  try {
    const settings = await getSettings();

    // If Valkey is not enabled in settings, return false
    if (!settings.externalServices?.valkey?.enabled) {
      return false;
    }

    const valkeySettings = settings.externalServices.valkey;

    await initValKeyClient({
      host: valkeySettings.host,
      port: valkeySettings.port,
      username: valkeySettings.username,
      password: valkeySettings.password,
    });

    return isConnected;
  } catch (error) {
    console.error("Failed to initialize Valkey from settings:", error);
    return false;
  }
}

/**
 * Check if the client is connected
 */
export function isValKeyConnected(): boolean {
  return isConnected && client !== null;
}

/**
 * Get a value from Valkey
 */
export async function getValue(key: string): Promise<string | null> {
  if (!isConnected || !client) return null;

  try {
    return await client.get(key);
  } catch (error) {
    console.error(`Error retrieving key ${key} from Valkey:`, error);
    return null;
  }
}

/**
 * Set a value in Valkey
 */
export async function setValue(key: string, value: string): Promise<boolean> {
  if (!isConnected || !client) return false;

  try {
    await client.set(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting key ${key} in Valkey:`, error);
    return false;
  }
}

/**
 * Get all values matching a pattern
 */
export async function getKeysValues(
  pattern: string
): Promise<Record<string, string>> {
  if (!isConnected || !client) return {};

  try {
    const keys = await client.keys(pattern);
    const result: Record<string, string> = {};

    for (const key of keys) {
      const value = await client.get(key);
      if (value) result[key] = value;
    }

    return result;
  } catch (error) {
    console.error(
      `Error retrieving keys matching ${pattern} from Valkey:`,
      error
    );
    return {};
  }
}
