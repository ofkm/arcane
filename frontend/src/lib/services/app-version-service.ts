import { version as currentVersion } from '$app/environment';
import type { AppVersionInformation } from '$lib/types/application-configuration';

export class AppVersionService {
	private cachedVersionInfo: AppVersionInformation | null = null;
	private lastFetchTime: number = 0;
	private readonly cacheExpiry = 1000 * 60 * 60 * 3; // 3 hours

	getCurrentVersion(): string {
		return currentVersion;
	}

	async getNewestVersion(): Promise<string> {
		try {
			const response = await fetch('https://api.github.com/repos/ofkm/arcane/releases/latest');
			if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

			const data = await response.json();
			return data.tag_name.replace(/^v/, '');
		} catch (error) {
			console.error('Error fetching newest version:', error);
			return this.getCurrentVersion();
		}
	}

	async isUpToDate(): Promise<boolean> {
		const newest = await this.getNewestVersion();
		const current = this.getCurrentVersion().replace(/^v/, '');
		return !this.isNewerVersion(newest, current);
	}

	async getVersionInformation(): Promise<AppVersionInformation> {
		const cacheExpired = Date.now() - this.lastFetchTime > this.cacheExpiry;

		if (!this.cachedVersionInfo || cacheExpired) {
			try {
				const [newestVersion, isUpToDate] = await Promise.all([
					this.getNewestVersion(),
					this.isUpToDate()
				]);

				this.cachedVersionInfo = {
					currentVersion: this.getCurrentVersion(),
					newestVersion,
					updateAvailable: !isUpToDate
				};
				this.lastFetchTime = Date.now();
			} catch (error) {
				console.error('Error fetching version information:', error);
				return { currentVersion: this.getCurrentVersion() };
			}
		}

		return this.cachedVersionInfo;
	}

	private isNewerVersion(latest: string, current: string): boolean {
		if (!latest || !current) return false;

		const latestParts = latest.split('.').map(Number);
		const currentParts = current.split('.').map(Number);

		for (let i = 0; i < 3; i++) {
			if ((latestParts[i] || 0) > (currentParts[i] || 0)) return true;
			if ((latestParts[i] || 0) < (currentParts[i] || 0)) return false;
		}

		return false;
	}
}

export const versionService = new AppVersionService();
