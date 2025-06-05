import { drizzle } from 'drizzle-orm/libsql';

/**
 * Determines the appropriate database connection string based on the runtime environment
 */
async function getDatabaseConnectionString(): Promise<string> {
	const fallbackConnection = 'file:data/arcane.db';

	// Check if we're in a SvelteKit environment (browser or server-side)
	if (typeof window !== 'undefined') {
		// Browser environment - should not access database directly
		console.warn('Database connection attempted in browser environment');
		return fallbackConnection;
	}

	// Server-side environment detection
	try {
		// Try SvelteKit dynamic environment first (preferred in SvelteKit apps)
		const { env } = await import('$env/dynamic/private');
		const connectionString = env.DB_CONN_STRING;

		if (connectionString) {
			console.log('Using database connection from SvelteKit environment');
			return connectionString;
		} else {
			console.log('DB_CONN_STRING not found in SvelteKit environment, checking process.env');
		}
	} catch (error) {
		console.log('SvelteKit environment not available, falling back to process.env');
		console.debug('SvelteKit import error:', error instanceof Error ? error.message : String(error));
	}

	// Fallback to Node.js process.env
	try {
		const connectionString = process.env.DB_CONN_STRING;

		if (connectionString) {
			console.log('Using database connection from process.env');
			return connectionString;
		} else {
			console.log('DB_CONN_STRING not found in process.env, using default connection');
		}
	} catch (error) {
		console.error('Error accessing process.env:', error instanceof Error ? error.message : String(error));
	}

	console.log(`Using fallback database connection: ${fallbackConnection}`);
	return fallbackConnection;
}

/**
 * Initialize database connection
 */
async function initializeDatabase() {
	try {
		const connectionString = await getDatabaseConnectionString();
		return drizzle(connectionString);
	} catch (error) {
		console.error('Failed to initialize database connection:', error instanceof Error ? error.message : String(error));
		console.log('Falling back to default SQLite database');
		return drizzle('file:data/arcane.db');
	}
}

// Create a promise that resolves to the database instance
const dbPromise = initializeDatabase();

// Export the database instance (will be a promise initially, then resolves to the actual db)
export const db = await dbPromise;

// Alternative export for cases where you need to explicitly wait for initialization
export const getDatabase = () => dbPromise;

// Export type for the database instance
export type Database = typeof db;
