import type { Agent, AgentStats, AgentTask, AgentToken, AgentResource } from './agent.type';

export interface BaseResponse {
	success: boolean;
	error?: string;
}

export interface AgentResponse extends BaseResponse {
	agent?: Agent;
}

export interface AgentsListResponse extends BaseResponse {
	agents: Agent[];
	count: number;
}

export interface TaskResponse extends BaseResponse {
	task?: AgentTask;
}

export interface TasksListResponse extends BaseResponse {
	tasks: AgentTask[];
	count: number;
}

export interface AgentStatsResponse extends BaseResponse {
	stats?: AgentStats;
}

export interface HeartbeatResponse extends BaseResponse {
	message?: string;
}

export interface AgentTokenResponse extends BaseResponse {
	token?: AgentToken;
	value?: string;
}

export interface AgentTokensListResponse extends BaseResponse {
	tokens: AgentToken[];
	count: number;
}

export interface AgentResourceResponse {
	success: boolean;
	resource?: AgentResource;
	resources?: Record<string, AgentResource>;
	containers?: any[];
	images?: any[];
	networks?: any[];
	volumes?: any[];
	lastSync?: string;
	agentId?: string;
	message?: string;
}
