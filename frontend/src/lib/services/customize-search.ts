import axios from 'axios';
import type { CustomizeSearchResponse, CustomizeCategory } from '$lib/types/customize-search.type';

export class CustomizeSearchService {
	private baseUrl = '/api/customize';

	async search(query: string): Promise<CustomizeSearchResponse> {
		const response = await axios.post<CustomizeSearchResponse>(`${this.baseUrl}/search`, {
			query
		});
		return response.data;
	}

	async getCategories(): Promise<CustomizeCategory[]> {
		const response = await axios.get<CustomizeCategory[]>(`${this.baseUrl}/categories`);
		return response.data;
	}
}

export const customizeSearchService = new CustomizeSearchService();
