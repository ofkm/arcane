import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './src/db/migrations',
	schema: './src/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DB_CONN_STRING || 'file:data/arcane.db'
	}
});
