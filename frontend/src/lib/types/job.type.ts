export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'cancelling';

export type JobType =
	| 'container_start'
	| 'container_stop'
	| 'container_restart'
	| 'container_delete'
	| 'container_create'
	| 'image_pull'
	| 'image_remove'
	| 'image_prune'
	| 'volume_remove'
	| 'volume_prune'
	| 'network_remove'
	| 'network_prune'
	| 'project_deploy'
	| 'project_down'
	| 'project_redeploy'
	| 'project_destroy'
	| 'project_pull_images'
	| 'project_restart'
	| 'system_start_all'
	| 'system_stop_all'
	| 'system_prune'
	| 'updater_run';

export interface Job {
	id: number;
	createdAt: string;
	updatedAt: string;
	type: JobType;
	status: JobStatus;
	progress: number;
	message: string;
	error: string;
	startTime: string | null;
	endTime: string | null;
	cancelToken: string;
	userId: number;
	username: string;
	metadata: Record<string, any> | null;
	result: Record<string, any> | null;
}

export interface JobStats {
	pending: number;
	running: number;
	completed: number;
	failed: number;
	cancelled: number;
	total: number;
}

export interface JobListFilters {
	status?: JobStatus;
	type?: JobType;
	userId?: number;
}
