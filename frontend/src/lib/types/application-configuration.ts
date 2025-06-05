export interface AppVersionInformation {
	currentVersion: string;
	newestVersion?: string;
	updateAvailable?: boolean;
	releaseUrl?: string;
	releaseNotes?: string;
}
