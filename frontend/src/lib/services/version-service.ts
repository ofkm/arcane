import { version as currentVersion } from '$app/environment';
import axios from 'axios';
import type { AppVersionInformation } from '$lib/types/application-configuration';

function getCurrentVersion() {
	return currentVersion;
}

async function getVersionInformation(): Promise<AppVersionInformation> {
	const res = await axios.get('/api/version', {
		params: { current: getCurrentVersion() },
		timeout: 2000
	});
	const data = res.data as {
		currentVersion?: string;
		newestVersion?: string;
		updateAvailable?: boolean;
		releaseUrl?: string;
	};

	const current = getCurrentVersion();
	const newest = data.newestVersion;
	const updateAvailable = newest ? newest !== current : false;

	return {
		currentVersion: current,
		newestVersion: newest,
		updateAvailable,
		releaseUrl: data.releaseUrl
	};
}

async function getNewestVersion(): Promise<string | undefined> {
	const info = await getVersionInformation();
	return info.newestVersion;
}

async function getReleaseUrl(): Promise<string | undefined> {
	const info = await getVersionInformation();
	return info.releaseUrl;
}

export default {
	getVersionInformation,
	getNewestVersion,
	getReleaseUrl,
	getCurrentVersion
};
