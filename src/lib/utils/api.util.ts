import type { Result } from './try-catch';
import { toast } from 'svelte-sonner';

/**
 * Handles the result of an API call, showing errors or executing a success callback.
 * Optionally sets a loading state to false on error.
 * @param result The result object from a try-catch utility.
 * @param errorMessage The base error message for logging and toast if an error occurs.
 * @param setLoadingState Optional setter function to set a boolean loading state to false specifically on error.
 * @param onSuccess Optional callback function to execute if there is no error. Receives the data from the result.
 */
export function handleApiReponse<T>(result: Result<T, Error>, message: string, setLoadingState: (value: boolean) => void, onSuccess: (data: T) => void) {
	if (result.error) {
		console.error(message + ':', result.error);
		toast.error(`${message}: ${result.error.message}`);
		setLoadingState(false);
		return;
	} else if (result.data) {
		onSuccess(result.data);
		setLoadingState(false);
	}
}
