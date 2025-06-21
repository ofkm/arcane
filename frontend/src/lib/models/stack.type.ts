export interface StackMeta {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	autoUpdate?: boolean;
	dirName?: string;
	path: string;
}

export interface StackPort {
	PublicPort?: number;
	PrivatePort?: number;
	Type?: string;
	[key: string]: any;
}

export interface NetworkSettings {
	Networks: Record<
		string,
		{
			IPAddress?: string;
			Driver?: string;
			[key: string]: any;
		}
	>;
}

export interface StackService {
	container_id: string;
	name: string;
	status: string;
	image?: string;
	ports?: string[];
	networks?: string[];
	volumes?: string[];
	environment?: Record<string, string>;
	restart_count?: number;
	health?: string;
	networkSettings?: NetworkSettings;
}

export interface Stack {
	id: string;
	name: string;
	services?: StackService[];
	serviceCount?: number;
	runningCount?: number;
	status: 'running' | 'stopped' | 'partially running' | 'unknown';
	isExternal?: boolean;
	createdAt?: string;
	updatedAt?: string;
	composeContent?: string;
	envContent?: string;
	isLegacy?: boolean;
	agentId?: string;
	agentHostname?: string;
	isRemote?: boolean;
	dirName?: string;
	lastPolled?: string;
	path?: string;
}

export interface StackUpdate {
	name?: string;
	composeContent?: string;
	envContent?: string;
	autoUpdate?: boolean;
}
