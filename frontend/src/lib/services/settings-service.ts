import BaseAPIService from './api-service';
import type { Settings, OidcStatusInfo } from '$lib/types/settings.type';
import { environmentStore } from '$lib/stores/environment.store';

type KeyValuePair = { key: string; value: string };

export default class SettingsService extends BaseAPIService {
	async getSettings(): Promise<Settings> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const data = await this.handleResponse(this.api.get(`/environments/${envId}/settings`));
		return this.normalize(data);
	}

	async getSettingsForEnvironment(environmentId: string): Promise<Settings> {
		const data = await this.handleResponse(this.api.get(`/environments/${environmentId}/settings`));
		return this.normalize(data);
	}

	async getPublicSettings(): Promise<Settings> {
		const data = await this.handleResponse(this.api.get(`/environments/0/settings/public`));
		return this.normalize(data);
	}

	async updateSettings(settings: Settings) {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const payload: Record<string, string> = {};
		for (const key in settings) {
			const v = (settings as any)[key];
			payload[key] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
		}
		const data = await this.handleResponse(this.api.put(`/environments/${envId}/settings`, payload));
		return this.normalize(data);
	}

	async getOidcStatus(): Promise<OidcStatusInfo> {
		return this.handleResponse(this.api.get('/oidc/status'));
	}

	private normalize(data: any): Settings {
		if (!data) {
			return {} as Settings;
		}

		if (!Array.isArray(data) && typeof data === 'object' && !data.key && !data.value) {
			return data as Settings;
		}

		let list: KeyValuePair[] = [];
		if (Array.isArray(data)) {
			list = data;
		} else {
			return data as Settings;
		}

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

export const settingsService = new SettingsService();
