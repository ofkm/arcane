// Main database schema exports - direct table exports for Drizzle Kit
export { settings, authSettings, oidcConfig, registryCredentials, templateRegistries } from './settings';

export { users, userSessions } from './users';

export { agents, agentMetrics, agentTasks, agentConnections } from './agents';

export { deployments, deploymentLogs, deploymentHistory } from './deployments';

export { stacks, stackServices, stackVariables } from './stacks';

// Re-export all tables for easy access
import * as settingsSchema from './settings';
import * as usersSchema from './users';
import * as agentsSchema from './agents';
import * as deploymentsSchema from './deployments';
import * as stacksSchema from './stacks';

export const schema = {
	...settingsSchema,
	...usersSchema,
	...agentsSchema,
	...deploymentsSchema,
	...stacksSchema
};

// Export table references for migrations and queries
export const tables = {
	// Settings tables
	settings: settingsSchema.settings,
	authSettings: settingsSchema.authSettings,
	oidcConfig: settingsSchema.oidcConfig,
	registryCredentials: settingsSchema.registryCredentials,
	templateRegistries: settingsSchema.templateRegistries,

	// User tables
	users: usersSchema.users,
	userSessions: usersSchema.userSessions,

	// Agent tables
	agents: agentsSchema.agents,
	agentMetrics: agentsSchema.agentMetrics,
	agentTasks: agentsSchema.agentTasks,
	agentConnections: agentsSchema.agentConnections,

	// Deployment tables
	deployments: deploymentsSchema.deployments,
	deploymentLogs: deploymentsSchema.deploymentLogs,
	deploymentHistory: deploymentsSchema.deploymentHistory,

	// Stack tables
	stacks: stacksSchema.stacks,
	stackServices: stacksSchema.stackServices,
	stackVariables: stacksSchema.stackVariables
};
