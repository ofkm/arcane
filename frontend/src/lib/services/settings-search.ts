import axios from 'axios';

export interface SettingMeta {
	key: string;
	label: string;
	type: string;
	keywords?: string[];
	description?: string;
}

export interface SettingsCategory {
	id: string;
	title: string;
	description: string;
	icon: string;
	url: string;
	keywords: string[];
	settings: SettingMeta[];
	matchingSettings?: SettingMeta[];
	relevanceScore?: number;
}

export interface SettingsSearchResponse {
	results: SettingsCategory[];
	query: string;
	count: number;
}

export class SettingsSearchService {
	private baseUrl = '/api/settings';

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

