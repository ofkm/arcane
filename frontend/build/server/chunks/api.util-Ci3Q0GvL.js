import { a as toast } from './Toaster.svelte_svelte_type_style_lang-B5vkOu6x.js';
import { e as extractDockerErrorMessage } from './errors.util-g315AnHn.js';

function handleApiResultWithCallbacks({ result, message, setLoadingState = () => {
}, onSuccess, onError = () => {
} }) {
  setLoadingState(true);
  if (result.error) {
    const dockerMsg = extractDockerErrorMessage(result.error);
    console.error(`API Error: ${message}:`, result.error);
    toast.error(`${message}: ${dockerMsg}`);
    onError(result.error);
    setLoadingState(false);
  } else {
    onSuccess(result.data);
    setLoadingState(false);
  }
}

export { handleApiResultWithCallbacks as h };
//# sourceMappingURL=api.util-Ci3Q0GvL.js.map
