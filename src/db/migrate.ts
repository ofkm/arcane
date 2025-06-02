import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './index';

export async function runMigrations() {
	try {
		console.log('Running database migrations...');
		await migrate(db, { migrationsFolder: './src/db/migrations' });
		console.log('Database migrations completed successfully');
	} catch (error) {
		if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('SQLITE_ERROR'))) {
			console.log('Database tables already exist, continuing...');
			return; // Don't throw, just continue
		}

		console.error('Error running migrations:', error);
		throw error;
	}
}
