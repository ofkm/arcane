import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const agents = sqliteTable('agents', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	hostname: text('hostname').notNull(),
	dockerHost: text('docker_host').notNull(),
	status: text('status', { enum: ['online', 'offline', 'error', 'unknown'] })
		.notNull()
		.default('unknown'),
	lastSeen: text('last_seen'),
	version: text('version'),
	platform: text('platform'),
	architecture: text('architecture'),
	registeredAt: text('registered_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const agentMetrics = sqliteTable('agent_metrics', {
	id: integer('id').primaryKey(),
	agentId: text('agent_id')
		.references(() => agents.id, { onDelete: 'cascade' })
		.notNull(),
	cpuUsage: real('cpu_usage'),
	memoryUsage: real('memory_usage'),
	diskUsage: real('disk_usage'),
	networkRx: integer('network_rx'),
	networkTx: integer('network_tx'),
	containersRunning: integer('containers_running'),
	containersTotal: integer('containers_total'),
	imagesTotal: integer('images_total'),
	volumesTotal: integer('volumes_total'),
	networksTotal: integer('networks_total'),
	timestamp: text('timestamp')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const agentTasks = sqliteTable('agent_tasks', {
	id: text('id').primaryKey(),
	agentId: text('agent_id')
		.references(() => agents.id, { onDelete: 'cascade' })
		.notNull(),
	type: text('type', {
		enum: ['container_start', 'container_stop', 'container_restart', 'container_remove', 'image_pull', 'image_remove', 'image_prune', 'volume_create', 'volume_remove', 'volume_prune', 'network_create', 'network_remove', 'network_prune', 'stack_deploy', 'stack_remove', 'stack_update', 'system_prune', 'system_info', 'system_df']
	}).notNull(),
	status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] })
		.notNull()
		.default('pending'),
	priority: integer('priority').notNull().default(5),
	payload: text('payload', { mode: 'json' }),
	result: text('result', { mode: 'json' }),
	error: text('error'),
	progress: integer('progress').default(0),
	startedAt: text('started_at'),
	completedAt: text('completed_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const agentConnections = sqliteTable('agent_connections', {
	id: integer('id').primaryKey(),
	agentId: text('agent_id')
		.references(() => agents.id, { onDelete: 'cascade' })
		.notNull(),
	connectionType: text('connection_type', { enum: ['websocket', 'http', 'grpc'] }).notNull(),
	endpoint: text('endpoint').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
	lastPing: text('last_ping'),
	latency: integer('latency'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});
