import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const deployments = sqliteTable('deployments', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	agentId: text('agent_id').notNull(), // Note: not FK to allow historical data
	stackName: text('stack_name').notNull(),
	stackPath: text('stack_path').notNull(),
	status: text('status', {
		enum: ['pending', 'deploying', 'deployed', 'failed', 'removing', 'removed', 'updating']
	})
		.notNull()
		.default('pending'),
	deploymentType: text('deployment_type', { enum: ['compose', 'swarm', 'kubernetes'] })
		.notNull()
		.default('compose'),
	composeContent: text('compose_content'), // Store the docker-compose.yml content
	environment: text('environment', { mode: 'json' }), // Environment variables as JSON
	networks: text('networks', { mode: 'json' }), // Network configuration as JSON
	volumes: text('volumes', { mode: 'json' }), // Volume mappings as JSON
	services: text('services', { mode: 'json' }), // Service definitions as JSON
	error: text('error'),
	deployedAt: text('deployed_at'),
	removedAt: text('removed_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const deploymentLogs = sqliteTable('deployment_logs', {
	id: integer('id').primaryKey(),
	deploymentId: text('deployment_id')
		.references(() => deployments.id, { onDelete: 'cascade' })
		.notNull(),
	level: text('level', { enum: ['info', 'warn', 'error', 'debug'] })
		.notNull()
		.default('info'),
	message: text('message').notNull(),
	source: text('source'), // Which service/container generated the log
	timestamp: text('timestamp')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const deploymentHistory = sqliteTable('deployment_history', {
	id: integer('id').primaryKey(),
	deploymentId: text('deployment_id')
		.references(() => deployments.id, { onDelete: 'cascade' })
		.notNull(),
	action: text('action', { enum: ['deploy', 'update', 'remove', 'restart', 'scale'] }).notNull(),
	previousStatus: text('previous_status').notNull(),
	newStatus: text('new_status').notNull(),
	changes: text('changes', { mode: 'json' }), // What changed in the deployment
	performedBy: text('performed_by'), // User ID who performed the action
	timestamp: text('timestamp')
		.notNull()
		.default(sql`(datetime('now'))`)
});
