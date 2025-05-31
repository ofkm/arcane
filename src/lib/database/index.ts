import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { schema } from './schema';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Database configuration
const DATABASE_PATH = process.env.DATABASE_PATH || './data/database/arcane.db';
const MIGRATIONS_PATH = './src/lib/database/migrations';

class DatabaseManager {
	private static instance: DatabaseManager;
	private db: ReturnType<typeof drizzle>;
	private sqlite: Database.Database;

	private constructor() {
		// Ensure database directory exists
		const dbDir = dirname(DATABASE_PATH);
		if (!existsSync(dbDir)) {
			mkdirSync(dbDir, { recursive: true });
		}

		// Initialize SQLite database
		this.sqlite = new Database(DATABASE_PATH);

		// Enable foreign keys and WAL mode for better performance
		this.sqlite.pragma('foreign_keys = ON');
		this.sqlite.pragma('journal_mode = WAL');
		this.sqlite.pragma('synchronous = NORMAL');
		this.sqlite.pragma('cache_size = 1000');
		this.sqlite.pragma('temp_store = memory');

		// Initialize Drizzle ORM
		this.db = drizzle(this.sqlite, { schema });

		console.log(`Database initialized at: ${DATABASE_PATH}`);
	}

	public static getInstance(): DatabaseManager {
		if (!DatabaseManager.instance) {
			DatabaseManager.instance = new DatabaseManager();
		}
		return DatabaseManager.instance;
	}

	public getDatabase() {
		return this.db;
	}

	public getSqlite() {
		return this.sqlite;
	}

	public async runMigrations() {
		try {
			console.log('Running database migrations...');
			await migrate(this.db, { migrationsFolder: MIGRATIONS_PATH });
			console.log('Database migrations completed successfully');
		} catch (error) {
			console.error('Failed to run database migrations:', error);
			throw error;
		}
	}

	public async backup(backupPath?: string) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const defaultPath = `./data/backups/arcane-backup-${timestamp}.db`;
		const path = backupPath || defaultPath;

		// Ensure backup directory exists
		const backupDir = dirname(path);
		if (!existsSync(backupDir)) {
			mkdirSync(backupDir, { recursive: true });
		}

		try {
			await this.sqlite.backup(path);
			console.log(`Database backup created: ${path}`);
			return path;
		} catch (error) {
			console.error('Failed to create database backup:', error);
			throw error;
		}
	}

	public async vacuum() {
		try {
			this.sqlite.prepare('VACUUM').run();
			console.log('Database vacuum completed');
		} catch (error) {
			console.error('Failed to vacuum database:', error);
			throw error;
		}
	}

	public async close() {
		try {
			this.sqlite.close();
			console.log('Database connection closed');
		} catch (error) {
			console.error('Failed to close database connection:', error);
			throw error;
		}
	}

	// Health check
	public async healthCheck(): Promise<boolean> {
		try {
			const result = this.sqlite.prepare('SELECT 1 as health').get() as { health: number } | undefined;
			return result?.health === 1;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}

	// Transaction wrapper
	public transaction<T>(fn: (tx: typeof this.db) => T): T {
		return this.sqlite.transaction(() => fn(this.db))();
	}
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();
export const db = dbManager.getDatabase();
export { schema };

// Initialize database on module load
export async function initializeDatabase() {
	try {
		await dbManager.runMigrations();
		console.log('Database initialization completed');
	} catch (error) {
		console.error('Database initialization failed:', error);
		throw error;
	}
}
