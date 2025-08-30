export interface ProjectPort {
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

export interface ProjectService {
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

export interface Project {
	id: string;
	name: string;
	path: string;
	runningCount: string;
	serviceCount: string;
	status: string;
	updatedAt: string;
	createdAt: string;
	autoUpdate?: boolean;
	services?: ProjectService[];
	composeContent?: string;
	envContent?: string;
}
