import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';

export async function runMigrations() {
	try {
		console.log('Running database migrations...');
		await migrate(db, { migrationsFolder: './src/db/migrations' });
		console.log('Database migrations completed successfully');
	} catch (error) {
		console.error('Error running migrations:', error);
		// Don't silently continue on migration errors - this is critical
		throw error;
	}
}
