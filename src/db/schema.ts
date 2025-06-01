import { int, sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settingsTable = sqliteTable('settings_table', {
	id: int().primaryKey({ autoIncrement: true }),
	dockerHost: text().notNull(),
	stacksDirectory: text().notNull(),
	autoUpdate: integer({ mode: 'boolean' }).notNull().default(false),
	autoUpdateInterval: int().notNull().default(300),
	pollingEnabled: integer({ mode: 'boolean' }).notNull().default(true),
	pollingInterval: int().notNull().default(5),
	pruneMode: text({ enum: ['all', 'dangling'] }),
	registryCredentials: text({ mode: 'json' }).notNull().default('[]'), // JSON array of RegistryCredential
	templateRegistries: text({ mode: 'json' }).notNull().default('[]'), // JSON array of TemplateRegistryConfig
	auth: text({ mode: 'json' }).notNull(), // JSON object of AuthSettings
	onboarding: text({ mode: 'json' }), // JSON object of Onboarding (optional)
	baseServerUrl: text(),
	maturityThresholdDays: int().notNull().default(30),
	createdAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});
