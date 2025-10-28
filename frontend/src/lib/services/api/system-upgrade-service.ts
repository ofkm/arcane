import axios from 'axios';

export interface UpgradeCheckResponse {
	canUpgrade: boolean;
	error: boolean;
	message: string;
}

export interface UpgradeResponse {
	message: string;
	success: boolean;
	error?: string;
}

export interface HealthCheckResult {
	healthy: boolean;
}

/**
 * Check if the system can perform a self-upgrade
 * @returns Promise with upgrade availability status
 */
async function checkUpgradeAvailable(): Promise<UpgradeCheckResponse> {
	const res = await axios.get<UpgradeCheckResponse>('/api/environments/0/system/upgrade/check');
	return res.data;
}

/**
 * Trigger a system self-upgrade
 * @returns Promise with upgrade initiation result
 */
async function triggerUpgrade(): Promise<UpgradeResponse> {
	const res = await axios.post<UpgradeResponse>('/api/environments/0/system/upgrade');
	return res.data;
}

/**
 * Check system health
 * @param environmentId - Optional environment ID for remote environments (defaults to local system)
 * @returns Promise with health check result
 */
async function checkHealth(environmentId: string = '0'): Promise<HealthCheckResult> {
	try {
		const endpoint = environmentId === '0' ? '/api/health' : `/api/environments/${environmentId}/system/health`;
		const res = await axios.head(endpoint, {
			timeout: 3000
		});
		return { healthy: res.status === 200 };
	} catch {
		return { healthy: false };
	}
}

export default {
	checkUpgradeAvailable,
	triggerUpgrade,
	checkHealth
};
