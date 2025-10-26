import axios from 'axios';
import type { SettingsSearchResponse, SettingsCategory } from '$lib/types/settings-search.type';

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export class SettingsSearchService {
	private baseUrl = `${basePath}/api/settings`;

	async search(query: string): Promise<SettingsSearchResponse> {
		const response = await axios.post<SettingsSearchResponse>(`${this.baseUrl}/search`, {
			query
		});
		return response.data;
	}

	async getCategories(): Promise<SettingsCategory[]> {
		const response = await axios.get<SettingsCategory[]>(`${this.baseUrl}/categories`);
		return response.data;
	}
}

export const settingsSearchService = new SettingsSearchService();
