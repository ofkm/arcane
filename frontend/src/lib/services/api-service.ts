import axios, { type AxiosResponse } from 'axios';

abstract class BaseAPIService {
	api = axios.create({
		baseURL: '/api',
		withCredentials: true
	});

	constructor() {
		if (typeof process !== 'undefined' && process?.env?.DEV_BACKEND_URL) {
			this.api.defaults.baseURL = process.env.DEV_BACKEND_URL;
		}

		this.api.interceptors.response.use(
			(response) => response,
			(error) => {
				console.log(error);
				const status = error?.response?.status;
				if (status === 401 && typeof window !== 'undefined') {
					let reqUrl: string = error?.config?.url ?? '';
					const baseURL: string = error?.config?.baseURL ?? this.api.defaults.baseURL ?? '';
					try {
						if (/^https?:\/\//i.test(reqUrl)) {
							const u = new URL(reqUrl);
							reqUrl = u.pathname;
						} else if (baseURL && /^https?:\/\//i.test(baseURL)) {
							// if baseURL is absolute and url is relative, construct full url then extract pathname
							const u = new URL(reqUrl, baseURL);
							reqUrl = u.pathname;
						}
					} catch (e) {
						// ignore URL parse errors and fall back to raw reqUrl
					}

					if (reqUrl.startsWith('/api')) {
						reqUrl = reqUrl.slice(4) || '/';
					}

					const skipAuthPaths = [
						'/auth/login',
						'/auth/logout',
						'/auth/oidc',
						'/auth/oidc/login',
						'/auth/oidc/callback',
						'/settings/public'
					];
					const isAuthApi = skipAuthPaths.some((p) => reqUrl.startsWith(p));

					const pathname = window.location.pathname || '/';
					const isOnAuthPage = pathname.startsWith('/auth');

					if (!isAuthApi && !isOnAuthPage) {
						const redirectTo = encodeURIComponent(pathname);
						// Hard replace to avoid history pollution
						window.location.replace(`/auth/login?redirect=${redirectTo}`);
						// Stop further promise chain
						return new Promise(() => {});
					}
				}
				return Promise.reject(error);
			}
		);
	}

	protected async handleResponse<T>(promise: Promise<AxiosResponse>): Promise<T> {
		const response = await promise;
		const payload = response.data;
		const extracted =
			payload && typeof payload === 'object' && 'data' in payload && (payload as any).data !== undefined
				? (payload as any).data
				: payload;
		return extracted as T;
	}
}

export default BaseAPIService;
