import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const stacks = sqliteTable('stacks', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description'),
	path: text('path').notNull(), // Relative path from stacks directory
	composeFile: text('compose_file').notNull().default('docker-compose.yml'),
	envFile: text('env_file'), // Optional .env file
	category: text('category'), // For organizing stacks
	tags: text('tags', { mode: 'json' }), // Array of tags as JSON
	isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),
	templateSource: text('template_source'), // URL or registry where template came from
	version: text('version'),
	author: text('author'),
	license: text('license'),
	documentation: text('documentation'), // Markdown content
	requirements: text('requirements', { mode: 'json' }), // System requirements as JSON
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const stackServices = sqliteTable('stack_services', {
	id: integer('id').primaryKey(),
	stackId: text('stack_id')
		.references(() => stacks.id, { onDelete: 'cascade' })
		.notNull(),
	serviceName: text('service_name').notNull(),
	image: text('image').notNull(),
	ports: text('ports', { mode: 'json' }), // Port mappings as JSON
	environment: text('environment', { mode: 'json' }), // Environment variables as JSON
	volumes: text('volumes', { mode: 'json' }), // Volume mappings as JSON
	networks: text('networks', { mode: 'json' }), // Network connections as JSON
	depends_on: text('depends_on', { mode: 'json' }), // Service dependencies as JSON
	restart: text('restart').default('unless-stopped'),
	healthcheck: text('healthcheck', { mode: 'json' }), // Healthcheck configuration as JSON
	labels: text('labels', { mode: 'json' }), // Docker labels as JSON
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const stackVariables = sqliteTable('stack_variables', {
	id: integer('id').primaryKey(),
	stackId: text('stack_id')
		.references(() => stacks.id, { onDelete: 'cascade' })
		.notNull(),
	name: text('name').notNull(),
	value: text('value'),
	defaultValue: text('default_value'),
	description: text('description'),
	type: text('type', { enum: ['string', 'number', 'boolean', 'select'] })
		.notNull()
		.default('string'),
	required: integer('required', { mode: 'boolean' }).notNull().default(false),
	options: text('options', { mode: 'json' }), // For select type, array of options as JSON
	validation: text('validation'), // Regex pattern for validation
	isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});
