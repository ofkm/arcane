import BaseAPIService from './api-service';
import type { Settings, SettingRawResponse, OidcStatusInfo } from '$lib/types/settings.type';

type KeyValuePair = { key: string; value: string };

export default class SettingsAPIService extends BaseAPIService {
	async getSettings(): Promise<Settings> {
		const res = await this.api.get('/settings');
		return this.normalize(res.data);
	}

	async getPublicSettings(): Promise<Settings> {
		const res = await this.api.get('/settings/public');
		return this.normalize(res.data);
	}

	async updateSettings(settings: Settings) {
		const payload: Record<string, string> = {};
		for (const key in settings) {
			const v = (settings as any)[key];
			payload[key] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
		}
		const res = await this.api.put('/settings', payload);
		return this.normalize(res.data);
	}

	async getOidcStatus(): Promise<OidcStatusInfo> {
		return this.handleResponse(this.api.get('/oidc/status'));
	}

	private normalize(data: any): Settings {
		if (data && !Array.isArray(data) && !Array.isArray(data?.settings)) {
			return data as Settings;
		}

		let list: KeyValuePair[] = [];
		if (Array.isArray(data)) list = data;
		else if (Array.isArray(data?.settings)) list = data.settings;

		const settings: Record<string, unknown> = {};
		list.forEach(({ key, value }) => {
			settings[key] = this.parseValue(key, value);
		});
		return settings as Settings;
	}

	private parseValue(key: string, value: string) {
		if (key === 'onboardingSteps' || key === 'registryCredentials' || key === 'templateRegistries') {
			try {
				return JSON.parse(value);
			} catch {
				if (key === 'onboardingSteps') return {};
				return [];
			}
		}
		if (value === 'true') return true;
		if (value === 'false') return false;
		if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
		return value;
	}
}
