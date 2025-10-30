export interface ProjectSettings {
	projectId: string;
	autoUpdate: boolean | null;
	autoUpdateCron: string | null;
}

export interface ProjectSettingsUpdate {
	autoUpdate?: boolean | null;
	autoUpdateCron?: string | null;
}
