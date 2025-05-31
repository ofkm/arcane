import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/database/schema/*.ts',
	out: './src/lib/database/migrations',
	dbCredentials: {
		url: process.env.DATABASE_URL || './data/database/arcane.db'
	},
	verbose: true,
	strict: true
});
