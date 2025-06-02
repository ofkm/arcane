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

export const usersTable = sqliteTable('users_table', {
	id: text('id').primaryKey(), // Make sure the column name is explicit
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash'), // Use snake_case for column names
	displayName: text('display_name'),
	email: text('email'),
	roles: text('roles', { mode: 'json' }).notNull().default('[]'),
	requirePasswordChange: integer('require_password_change', { mode: 'boolean' }).notNull().default(false),
	oidcSubjectId: text('oidc_subject_id'),
	lastLogin: int('last_login', { mode: 'timestamp' }),
	createdAt: int('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`), // Fixed: Added missing closing parenthesis
	updatedAt: int('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const stacksTable = sqliteTable('stacks_table', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	dirName: text('dir_name'), // Directory name if different from stack name
	path: text('path').notNull(), // Full path to stack directory
	autoUpdate: integer('auto_update', { mode: 'boolean' }).notNull().default(false),
	isExternal: integer('is_external', { mode: 'boolean' }).notNull().default(false),
	isLegacy: integer('is_legacy', { mode: 'boolean' }).notNull().default(false),
	isRemote: integer('is_remote', { mode: 'boolean' }).notNull().default(false),
	agentId: text('agent_id'), // For remote stacks
	agentHostname: text('agent_hostname'), // For remote stacks
	status: text('status', { enum: ['running', 'stopped', 'partially running', 'unknown'] })
		.notNull()
		.default('unknown'),
	serviceCount: int('service_count').notNull().default(0),
	runningCount: int('running_count').notNull().default(0),
	composeContent: text('compose_content'), // Store docker-compose.yml content
	envContent: text('env_content'), // Store .env file content
	lastPolled: int('last_polled', { mode: 'timestamp' }), // When the stack was last checked
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});
