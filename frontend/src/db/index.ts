/**
 * Database access is now handled by the Go backend.
 * This file exists only for compatibility with existing imports.
 */

console.log('Database functionality has been migrated to the Go backend');

// Create a proxy to catch and log any attempts to use the database directly
const dbProxy = new Proxy(
	{},
	{
		get: (target, prop) => {
			console.warn(`Attempted to access database method '${String(prop)}' directly. Database access is now handled by the Go backend.`);
			// Return a function that logs warnings but doesn't throw errors
			return (...args: any[]) => {
				console.warn(`Called database method '${String(prop)}' with args:`, args);
				console.warn('This is a no-op as database access is now handled by the Go backend.');
				return Promise.resolve([]);
			};
		}
	}
);

export const db = dbProxy;
export const getDatabase = () => Promise.resolve(dbProxy);
export type Database = typeof db;
