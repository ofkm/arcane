export interface StackMeta {
	name: string;
	createdAt: string;
	updatedAt: string;
	autoUpdate?: boolean;
}

export interface StackService {
	id: string;
	name: string;
	state?: {
		Running: boolean;
		Status: string;
		ExitCode: number;
	};
	ports?: string[];
}

export interface Stack {
	id: string;
	name: string;
	dirName?: string;
	path?: string;
	services?: StackService[];
	serviceCount?: number;
	runningCount?: number;
	status?: 'running' | 'stopped' | 'partially running';
	isExternal?: boolean;
	createdAt?: string;
	updatedAt?: string;
	composeContent?: string;
	envContent?: string;
	meta?: StackMeta;
}

export interface StackUpdate {
	name?: string;
	composeContent?: string;
	envContent?: string;
	autoUpdate?: boolean;
}
