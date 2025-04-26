export interface StackMeta {
	name: string;
	createdAt: string;
	updatedAt: string;
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
	serviceCount: number;
	runningCount: number;
	status: 'running' | 'partially running' | 'stopped';
	createdAt: string;
	updatedAt: string;
	composeContent?: string;
	isExternal?: boolean;
	compose?: any;
}

export interface StackUpdate {
	name?: string;
	composeContent?: string;
}
