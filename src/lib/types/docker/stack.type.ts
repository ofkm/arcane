export interface StackMeta {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	autoUpdate?: boolean;
	dirName?: string;
	path: string;
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
}

export interface StackUpdate {
	name?: string;
	composeContent?: string;
	envContent?: string;
	autoUpdate?: boolean;
}
