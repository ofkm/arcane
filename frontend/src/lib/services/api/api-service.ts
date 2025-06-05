import axios, { type AxiosResponse } from 'axios';

abstract class BaseAPIService {
	api = axios.create({
		withCredentials: true
	});

	constructor() {
		this.api.defaults.baseURL = '/api';

		// Add response interceptor for consistent error handling
		this.api.interceptors.response.use(
			(response: AxiosResponse) => response,
			(error) => {
				console.error('API Error:', error.response?.data || error.message);
				return Promise.reject(error);
			}
		);
	}

	protected async handleResponse<T>(promise: Promise<AxiosResponse>): Promise<T> {
		const response = await promise;
		return response.data?.data || response.data;
	}
}

export default BaseAPIService;
