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
	statusReason?: string;
	updatedAt: string;
	createdAt: string;
	services?: ProjectService[];
	composeContent?: string;
	envContent?: string;
	autoUpdate?: boolean | null;
	updateScheduleEnabled?: boolean | null;
	updateScheduleWindows?: UpdateScheduleWindow[] | null;
	effectiveSettings?: ResolvedProjectSettings;
}

export interface ProjectStatusCounts {
	runningProjects: number;
	stoppedProjects: number;
	totalProjects: number;
}

export interface UpdateScheduleWindow {
	days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
	startTime: string;
	endTime: string;
	timezone: string;
}

export interface ResolvedProjectSettings {
	autoUpdate: boolean;
	updateScheduleEnabled: boolean;
	updateScheduleWindows?: UpdateScheduleWindow[];
}

export interface ProjectSettingsUpdate {
	autoUpdate?: boolean;
	updateScheduleEnabled?: boolean;
	updateScheduleWindows?: UpdateScheduleWindow[];
}
