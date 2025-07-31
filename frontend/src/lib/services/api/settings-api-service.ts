import BaseAPIService from './api-service';
import type { Settings, SettingRawResponse, OidcStatusInfo } from '$lib/types/settings.type';

export default class SettingsAPIService extends BaseAPIService {
	async getSettings(): Promise<Settings> {
		const response = await this.api.get('/settings');
		const parsed = this.parseConfigList(response.data.settings);
		return parsed;
	}

	async getPublicSettings(): Promise<Settings> {
		const response = await this.api.get('/settings/public');
		const parsed = this.parseConfigList(response.data.settings);
		return parsed;
	}

	async updateSettings(settings: Settings) {
		// Convert all values to string, with special handling for objects
		const settingsConvertedToString = {};
		for (const key in settings) {
			const value = (settings as any)[key];
			if (typeof value === 'object' && value !== null) {
				// Serialize objects to JSON string
				(settingsConvertedToString as any)[key] = JSON.stringify(value);
			} else {
				// Convert primitives to string
				(settingsConvertedToString as any)[key] = value.toString();
			}
		}
		const res = await this.api.put('/settings', settingsConvertedToString);

		// Check if response has the expected structure
		if (res.data && res.data.settings && Array.isArray(res.data.settings)) {
			return this.parseConfigList(res.data.settings);
		} else {
			// If the response doesn't have the expected array format, return the response as-is
			// or handle it differently based on your API's actual response structure
			console.warn('Unexpected response format from updateSettings:', res.data);
			return res.data;
		}
	}

	async getOidcStatus(): Promise<OidcStatusInfo> {
		return this.handleResponse(this.api.get('/oidc/status'));
	}

	private parseConfigList(data: SettingRawResponse) {
		const settings: Partial<Settings> = {};
		data.forEach(({ key, value }) => {
			(settings as any)[key] = this.parseValue(key, value);
		});

		return settings as Settings;
	}

	private parseValue(key: string, value: string) {
		// Special handling for JSON fields
		if (
			key === 'onboardingSteps' ||
			key === 'registryCredentials' ||
			key === 'templateRegistries'
		) {
			try {
				return JSON.parse(value);
			} catch {
				// Return default empty object/array if parsing fails
				if (key === 'onboardingSteps') return {};
				return [];
			}
		}

		// Handle other data types
		if (value === 'true') {
			return true;
		} else if (value === 'false') {
			return false;
		} else if (/^-?\d+(\.\d+)?$/.test(value)) {
			return parseFloat(value);
		} else {
			return value;
		}
	}
}
