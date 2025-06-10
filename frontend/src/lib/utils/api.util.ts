import type { Result } from './try-catch'; // Assuming Result<T, Error> is { data?: T, error?: Error }
import { toast } from 'svelte-sonner';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';

export function handleApiResultWithCallbacks<T>({
	result,
	message,
	setLoadingState = () => {},
	onSuccess,
	onError = () => {}
}: {
	result: Result<T, Error>;
	message: string;
	setLoadingState?: (value: boolean) => void;
	onSuccess: (data: T) => void;
	onError?: (error: Error) => void;
}) {
	setLoadingState(true);

	if (result.error) {
		const dockerMsg = extractDockerErrorMessage(result.error);
		console.error(`API Error: ${message}:`, result.error);
		toast.error(`${message}: ${dockerMsg}`);
		onError(result.error);
		setLoadingState(false);
	} else {
		onSuccess(result.data as T);
		setLoadingState(false);
	}
}
