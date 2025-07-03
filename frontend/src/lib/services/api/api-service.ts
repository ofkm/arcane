import axios, { type AxiosResponse } from 'axios';
import { building, dev } from '$app/environment';
import { browser } from '$app/environment';

abstract class BaseAPIService {
	api = axios.create({
		withCredentials: true
	});

	constructor() {
		if (!building) {
			if (browser) {
				this.api.defaults.baseURL = '/api';
			} else {
				const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
				this.api.defaults.baseURL = `${backendUrl}/api`;
			}

			this.api.interceptors.response.use(
				(response: AxiosResponse) => {
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
		if (building) {
			return {} as T;
		}

		const response = await promise;

		const extractedData = response.data || response.data.data;

		return extractedData;
	}
}

export default BaseAPIService;
