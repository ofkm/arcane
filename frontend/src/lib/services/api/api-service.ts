import axios, { type AxiosResponse } from 'axios';
import { building, dev } from '$app/environment';
import { browser } from '$app/environment';

abstract class BaseAPIService {
	api = axios.create({
		withCredentials: true
	});

	constructor() {
		// Only set up API configuration if not building
		if (!building) {
			// In browser, use relative URLs
			if (browser) {
				this.api.defaults.baseURL = '/api';
			} else {
				// On server side, use absolute URL if available
				const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
				this.api.defaults.baseURL = `${backendUrl}/api`;
			}

			// Add response interceptor for consistent error handling
			this.api.interceptors.response.use(
				(response: AxiosResponse) => {
					console.log(`API Response [${response.config.method?.toUpperCase()} ${response.config.url}]:`, response.data);
					return response;
				},
				(error) => {
					// Only log errors if not building
					if (!building) {
						console.error(`API Error [${error.config?.method?.toUpperCase()} ${error.config?.url}]:`, {
							status: error.response?.status,
							data: error.response?.data,
							message: error.message
						});
					}
					return Promise.reject(error);
				}
			);
		}
	}

	protected async handleResponse<T>(promise: Promise<AxiosResponse>): Promise<T> {
		// During build, return empty/default responses
		if (building) {
			return {} as T;
		}

		const response = await promise;
		console.log('BaseAPIService handleResponse - raw response:', response.data);

		// Try different ways to extract the data based on common Go backend patterns
		const extractedData = response.data?.data || response.data?.result || response.data;
		console.log('BaseAPIService handleResponse - extracted data:', extractedData);

		return extractedData;
	}
}

export default BaseAPIService;
