import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

let dbConnString: string;

try {
	const { env } = await import('$env/dynamic/private');
	dbConnString = env.DB_CONN_STRING || 'file:data/arcane.db';
} catch {
	dbConnString = process.env.DB_CONN_STRING || 'file:data/arcane.db';
}

export const db = drizzle(dbConnString);
