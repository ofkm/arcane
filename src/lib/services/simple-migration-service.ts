import { db, dbManager, initializeDatabase } from '../database';
import { settings } from '../database/schema/settings';

export class SimpleMigrationService {
	private initialized = false;

	async init() {
		if (!this.initialized) {
			await initializeDatabase();
			this.initialized = true;
			console.log('✅ Database initialized successfully');
		}
	}

	async healthCheck(): Promise<boolean> {
		try {
			await this.init();
			return await dbManager.healthCheck();
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}

	async getDatabaseInfo() {
		await this.init();
		const dbInstance = dbManager.getDatabase();
		const sqlite = dbInstance.$client;

		try {
			const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];

			const counts: Record<string, number | string> = {};
			const mainTables = ['users', 'agents', 'deployments', 'settings', 'stacks'];

			for (const table of mainTables) {
				try {
					const result = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
					counts[table] = result.count;
				} catch {
					counts[table] = 'Error';
				}
			}

			return {
				tables: tables.map((t) => t.name),
				counts,
				totalTables: tables.length
			};
		} catch (error) {
			console.error('Failed to get database info:', error);
			throw error;
		}
	}

	async createTestData() {
		await this.init();

		try {
			// Insert test settings if none exist
			const existingSettings = await db.select().from(settings).limit(1);

			if (existingSettings.length === 0) {
				await db.insert(settings).values({
					dockerHost: 'unix:///var/run/docker.sock',
					autoUpdate: false,
					autoUpdateInterval: 5,
					pollingEnabled: true,
					pollingInterval: 10,
					pruneMode: 'all',
					stacksDirectory: './data/stacks',
					maturityThresholdDays: 30,
					baseServerUrl: 'http://localhost:3000'
				});
				console.log('✅ Test settings created');
			}

			return true;
		} catch (error) {
			console.error('Failed to create test data:', error);
			return false;
		}
	}
}

// Export singleton instance
export const simpleMigrationService = new SimpleMigrationService();
