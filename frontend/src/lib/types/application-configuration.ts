export interface AppVersionInformation {
	currentVersion: string;
	displayVersion: string;
	revision: string;
	isSemverVersion: boolean;
	newestVersion?: string;
	updateAvailable?: boolean;
	releaseUrl?: string;
	releaseNotes?: string;
}
