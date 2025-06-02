import { int, sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
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
	registryCredentials: text({ mode: 'json' }).notNull().default('[]'),
	templateRegistries: text({ mode: 'json' }).notNull().default('[]'),
	auth: text({ mode: 'json' }).notNull(),
	onboarding: text({ mode: 'json' }),
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
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash'),
	displayName: text('display_name'),
	email: text('email'),
	roles: text('roles', { mode: 'json' }).notNull().default('[]'),
	requirePasswordChange: integer('require_password_change', { mode: 'boolean' }).notNull().default(false),
	oidcSubjectId: text('oidc_subject_id'),
	lastLogin: int('last_login', { mode: 'timestamp' }),
	createdAt: int('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const stacksTable = sqliteTable('stacks_table', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	dirName: text('dir_name'),
	path: text('path').notNull(),
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
	composeContent: text('compose_content'),
	envContent: text('env_content'),
	lastPolled: int('last_polled', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const agentsTable = sqliteTable('agents_table', {
	id: text('id').primaryKey(),
	hostname: text('hostname').notNull(),
	platform: text('platform').notNull(),
	version: text('version').notNull(),
	capabilities: text('capabilities', { mode: 'json' }).notNull().default('[]'),
	status: text('status', { enum: ['online', 'offline'] })
		.notNull()
		.default('offline'),
	lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull(),
	registeredAt: integer('registered_at', { mode: 'timestamp' }).notNull(),

	// Metrics (optional)
	containerCount: int('container_count'),
	imageCount: int('image_count'),
	stackCount: int('stack_count'),
	networkCount: int('network_count'),
	volumeCount: int('volume_count'),

	// Docker info (optional)
	dockerVersion: text('docker_version'),
	dockerContainers: int('docker_containers'),
	dockerImages: int('docker_images'),

	// Metadata (optional JSON object)
	metadata: text('metadata', { mode: 'json' }),

	createdAt: int('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const agentTasksTable = sqliteTable('agent_tasks_table', {
	id: text('id').primaryKey(),
	agentId: text('agent_id').notNull(),
	type: text('type', {
		enum: ['docker_command', 'stack_deploy', 'image_pull', 'health_check', 'container_start', 'container_stop', 'container_restart', 'container_remove', 'agent_upgrade']
	}).notNull(),
	payload: text('payload', { mode: 'json' }).notNull(),
	status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] })
		.notNull()
		.default('pending'),
	result: text('result', { mode: 'json' }),
	error: text('error'),

	// Execution timing
	startedAt: integer('started_at', { mode: 'timestamp' }),
	completedAt: integer('completed_at', { mode: 'timestamp' }),

	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Optional: Agent authentication/security table
export const agentTokensTable = sqliteTable('agent_tokens_table', {
	id: text('id').primaryKey(),
	agentId: text('agent_id').notNull(),
	token: text('token').notNull().unique(), // Hashed token for authentication
	name: text('name'), // Human-readable name for the token
	permissions: text('permissions', { mode: 'json' }).notNull().default('[]'), // JSON array of permissions
	lastUsed: integer('last_used', { mode: 'timestamp' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }), // Optional expiration
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const deploymentsTable = sqliteTable('deployments_table', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type', { enum: ['stack', 'container', 'image'] }).notNull(),
	status: text('status', { enum: ['pending', 'running', 'stopped', 'failed', 'completed'] })
		.notNull()
		.default('pending'),
	agentId: text('agent_id').notNull(),
	taskId: text('task_id'), // Links to agentTasksTable
	error: text('error'),

	// Metadata as JSON to match your interface
	metadata: text('metadata', { mode: 'json' }),

	createdAt: int('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: int('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Add foreign key relationships if you want referential integrity
// Note: SQLite foreign keys need to be enabled at runtime
export const agentRelations = {
	agentTasks: {
		// agentTasksTable.agentId -> agentsTable.id
	},
	agentTokens: {
		// agentTokensTable.agentId -> agentsTable.id
	},
	remoteStacks: {
		// stacksTable.agentId -> agentsTable.id (existing relationship)
	},
	deployments: {
		// deploymentsTable.agentId -> agentsTable.id
		// deploymentsTable.taskId -> agentTasksTable.id
	}
};

// Define proper relations using Drizzle's relations function
export const agentsRelations = relations(agentsTable, ({ many }) => ({
	tasks: many(agentTasksTable),
	tokens: many(agentTokensTable),
	remoteStacks: many(stacksTable),
	deployments: many(deploymentsTable)
}));

export const agentTasksRelations = relations(agentTasksTable, ({ one, many }) => ({
	agent: one(agentsTable, {
		fields: [agentTasksTable.agentId],
		references: [agentsTable.id]
	}),
	deployments: many(deploymentsTable)
}));

export const agentTokensRelations = relations(agentTokensTable, ({ one }) => ({
	agent: one(agentsTable, {
		fields: [agentTokensTable.agentId],
		references: [agentsTable.id]
	})
}));

export const stacksRelations = relations(stacksTable, ({ one }) => ({
	agent: one(agentsTable, {
		fields: [stacksTable.agentId],
		references: [agentsTable.id]
	})
}));

export const deploymentsRelations = relations(deploymentsTable, ({ one }) => ({
	agent: one(agentsTable, {
		fields: [deploymentsTable.agentId],
		references: [agentsTable.id]
	}),
	task: one(agentTasksTable, {
		fields: [deploymentsTable.taskId],
		references: [agentTasksTable.id]
	})
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
	// Add user relations if needed in the future
}));

export const settingsRelations = relations(settingsTable, ({ many }) => ({
	// Settings is typically a singleton, no relations needed
}));
