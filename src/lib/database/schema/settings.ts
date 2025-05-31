import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settings = sqliteTable('settings', {
	id: integer('id').primaryKey(),
	dockerHost: text('docker_host').notNull(),
	autoUpdate: integer('auto_update', { mode: 'boolean' }).notNull().default(false),
	autoUpdateInterval: integer('auto_update_interval').notNull().default(5),
	pollingEnabled: integer('polling_enabled', { mode: 'boolean' }).notNull().default(true),
	pollingInterval: integer('polling_interval').notNull().default(10),
	pruneMode: text('prune_mode', { enum: ['all', 'containers', 'images', 'volumes', 'networks'] })
		.notNull()
		.default('all'),
	stacksDirectory: text('stacks_directory').notNull(),
	maturityThresholdDays: integer('maturity_threshold_days').notNull().default(30),
	baseServerUrl: text('base_server_url'),
	onboarding: integer('onboarding', { mode: 'boolean' }),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const authSettings = sqliteTable('auth_settings', {
	id: integer('id').primaryKey(),
	settingsId: integer('settings_id')
		.references(() => settings.id)
		.notNull(),
	localAuthEnabled: integer('local_auth_enabled', { mode: 'boolean' }).notNull().default(true),
	oidcEnabled: integer('oidc_enabled', { mode: 'boolean' }).notNull().default(false),
	sessionTimeout: integer('session_timeout').notNull().default(60),
	passwordPolicy: text('password_policy', { enum: ['weak', 'medium', 'strong'] })
		.notNull()
		.default('strong'),
	rbacEnabled: integer('rbac_enabled', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const oidcConfig = sqliteTable('oidc_config', {
	id: integer('id').primaryKey(),
	authSettingsId: integer('auth_settings_id')
		.references(() => authSettings.id)
		.notNull(),
	clientId: text('client_id').notNull(),
	clientSecret: blob('client_secret').notNull(), // encrypted
	redirectUri: text('redirect_uri').notNull(),
	authorizationEndpoint: text('authorization_endpoint').notNull(),
	tokenEndpoint: text('token_endpoint').notNull(),
	userinfoEndpoint: text('userinfo_endpoint').notNull(),
	scopes: text('scopes').notNull().default('openid email profile'),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const registryCredentials = sqliteTable('registry_credentials', {
	id: integer('id').primaryKey(),
	settingsId: integer('settings_id')
		.references(() => settings.id)
		.notNull(),
	registryUrl: text('registry_url').notNull(),
	username: text('username').notNull(),
	password: blob('password').notNull(), // encrypted
	email: text('email'),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const templateRegistries = sqliteTable('template_registries', {
	id: integer('id').primaryKey(),
	settingsId: integer('settings_id')
		.references(() => settings.id)
		.notNull(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	description: text('description'),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});
