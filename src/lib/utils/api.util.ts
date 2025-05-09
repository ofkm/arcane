import type { Result } from './try-catch';
import { toast } from 'svelte-sonner';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';

export function handleApiResultWithCallbacks<T>({ result, message, setLoadingState = () => {}, onSuccess, onError = () => {} }: { result: Result<T, Error>; message: string; setLoadingState?: (value: boolean) => void; onSuccess: (result: Result<T, Error>) => void; onError?: (result: Result<T, Error>) => void }) {
	setLoadingState(true);
	if (result.error) {
		const dockerMsg = extractDockerErrorMessage(result.error);
		console.error(`onErrorCallback: ${message}:`, result.error);
		toast.error(`${message}: ${dockerMsg}`);
		setLoadingState(false);
		onError(result);
		return;
	} else if (result.data) {
		onSuccess(result);
		setLoadingState(false);
	}
}
