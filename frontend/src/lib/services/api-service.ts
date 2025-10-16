import axios, { type AxiosResponse } from 'axios';
import { toast } from 'svelte-sonner';

function extractServerMessage(data: any, includeErrors = false): string | undefined {
	const inner = (data && typeof data === 'object' ? ((data as any).data ?? data) : data) as any;
	if (typeof inner === 'string') {
		return inner;
	}
	if (inner) {
		const msg = inner.error || inner.message || inner.error_description;
		if (msg) return msg;
		if (includeErrors && Array.isArray(inner.errors) && inner.errors.length) {
			return inner.errors[0]?.message || inner.errors[0];
		}
	}
	return undefined;
}

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
					const serverMsg = extractServerMessage(error?.response?.data);
					const isVersionMismatch = serverMsg?.toLowerCase().includes('application has been updated');

					let reqUrl: string = error?.config?.url ?? '';
					const baseURL: string = error?.config?.baseURL ?? this.api.defaults.baseURL ?? '';
					try {
						if (/^https?:\/\//i.test(reqUrl)) {
							const u = new URL(reqUrl);
							reqUrl = u.pathname;
						} else if (baseURL && /^https?:\/\//i.test(baseURL)) {
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
						if (isVersionMismatch) {
							toast.info('Application has been updated. Please log in again.');
						}
						const redirectTo = encodeURIComponent(pathname);
						window.location.replace(`/auth/login?redirect=${redirectTo}`);
						return new Promise(() => {});
					}
				}

				try {
					const serverMsg = extractServerMessage(error?.response?.data, true);
					if (serverMsg) {
						error.message = serverMsg;
					}
				} catch {
					// ignore extraction issues; fall back to default axios message
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
