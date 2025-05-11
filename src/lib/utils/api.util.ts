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
	onSuccess: (data: T) => void; // Changed: Expects unwrapped data T
	onError?: (error: Error) => void; // Changed: Expects unwrapped error Error
}) {
	// Note: setLoadingState(true) is typically called *before* the async operation
	// that produces 'result'. Here, it's called after 'result' is available.
	// This means it will set loading to true, then immediately to false.
	// Consider moving setLoadingState(true) to before the API call if that's the intent.
	// For now, respecting its current placement within this utility.
	// setLoadingState(true); // If this was meant to indicate the start of callback processing.

	if (result.error) {
		const dockerMsg = extractDockerErrorMessage(result.error);
		console.error(`API Error: ${message}:`, result.error);
		toast.error(`${message}: ${dockerMsg}`);
		onError(result.error); // Pass the unwrapped error
		setLoadingState(false);
	} else {
		// If there's no error, assume result.data contains T.
		// This handles cases where T might be void (result.data could be undefined)
		// or T might be null (result.data could be null).
		// The original `else if (result.data)` was a truthy check.
		// A more robust assumption is: if no error, it's a success.
		onSuccess(result.data as T); // Pass result.data (which should be of type T), casting for safety.
		setLoadingState(false);
	}
}
