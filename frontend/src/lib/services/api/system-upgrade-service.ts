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

export default {
	checkUpgradeAvailable,
	triggerUpgrade
};
