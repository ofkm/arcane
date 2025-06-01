import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';

const DATABASE_PATH = process.env.DATABASE_URL || './data/database/arcane.db';

// Ensure database directory exists
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
	mkdirSync(dbDir, { recursive: true });
}

class DatabaseManager {
	private sqlite: Database.Database;
	private drizzle: ReturnType<typeof drizzle>;
	private initialized = false;

	constructor() {
		this.sqlite = new Database(DATABASE_PATH);
		this.sqlite.pragma('journal_mode = WAL');
		this.sqlite.pragma('foreign_keys = ON');

		this.drizzle = drizzle(this.sqlite, { schema });

		console.log(`Database initialized at: ${DATABASE_PATH}`);
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log('Running database migrations...');
		try {
			migrate(this.drizzle, { migrationsFolder: './src/lib/database/migrations' });
			console.log('Database migrations completed successfully');
		} catch (error) {
			console.error('Database migration failed:', error);
			throw error;
		}

		this.initialized = true;
		console.log('Database initialization completed');
	}

	getDatabase() {
		return this.drizzle;
	}

	async healthCheck(): Promise<boolean> {
		try {
			const result = this.sqlite.prepare('SELECT 1').get();
			return result !== undefined;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}

	async backup(backupPath?: string) {
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

	async vacuum() {
		try {
			this.sqlite.prepare('VACUUM').run();
			console.log('Database vacuum completed');
		} catch (error) {
			console.error('Failed to vacuum database:', error);
			throw error;
		}
	}

	async getStats(): Promise<{
		size: number;
		pageCount: number;
		pageSize: number;
		freePages: number;
	}> {
		try {
			const sizeResult = this.sqlite.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };
			const pageCount = this.sqlite.prepare('PRAGMA page_count').get() as { page_count: number };
			const pageSize = this.sqlite.prepare('PRAGMA page_size').get() as { page_size: number };
			const freePages = this.sqlite.prepare('PRAGMA freelist_count').get() as { freelist_count: number };

			return {
				size: sizeResult.size,
				pageCount: pageCount.page_count,
				pageSize: pageSize.page_size,
				freePages: freePages.freelist_count
			};
		} catch (error) {
			console.error('Failed to get database stats:', error);
			throw error;
		}
	}

	close() {
		if (this.sqlite) {
			this.sqlite.close();
		}
	}
}

// Create singleton instance
export const dbManager = new DatabaseManager();
export const db = dbManager.getDatabase();

export async function initializeDatabase(): Promise<void> {
	await dbManager.initialize();
}
