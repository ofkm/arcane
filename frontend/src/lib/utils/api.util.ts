import type { Result } from './try-catch';
import { toast } from 'svelte-sonner';

export function extractDockerErrorMessage(error: any): string {
	if (!error) return 'Unknown error';
	if (error.response && error.response.data) {
		const data = error.response.data;

		if (typeof data === 'string') return data;

		if (data.error && typeof data.error === 'string') {
			return data.error;
		}

		if (data.data && typeof data.data === 'object' && data.data.error) {
			return data.data.error;
		}

		if (data.message && typeof data.message === 'string') {
			return data.message;
		}
	}

	if (error.body) {
		if (typeof error.body === 'string') return error.body;
		if (error.body.error) return error.body.error;
		if (error.body.message) return error.body.message;
	}

	if (error.error && typeof error.error === 'string') return error.error;
	if (error.reason) return error.reason;
	if (error.stderr) return error.stderr;
	if (error.data && typeof error.data === 'string') return error.data;

	// Only use error.message as last resort (this is axios generic message)
	if (error.message && typeof error.message === 'string') return error.message;

	if (typeof error === 'string') return error;

	try {
		return JSON.stringify(error);
	} catch {
		return 'Unknown error';
	}
}

export async function handleApiResultWithCallbacks<T>({
	result,
	message,
	setLoadingState = () => {},
	onSuccess = async () => {},
	onError = async () => {}
}: {
	result: Result<T, Error>;
	message: string;
	setLoadingState?: (value: boolean) => void;
	onSuccess?: (data: T) => void | Promise<void>;
	onError?: (error: Error) => void | Promise<void>;
}) {
	try {
		setLoadingState(true);

		if (result.error) {
			const dockerMsg = extractDockerErrorMessage(result.error);
			console.error(`API Error: ${message}:`, result.error);
			toast.error(`${message}: ${dockerMsg}`);
			await Promise.resolve(onError(result.error));
		} else {
			await Promise.resolve(onSuccess(result.data as T));
		}
	} finally {
		try {
			setLoadingState(false);
		} catch (e) {
			console.warn('Failed to clear loading state', e);
		}
	}
}
