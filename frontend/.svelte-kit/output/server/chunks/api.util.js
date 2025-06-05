import "clsx";
import { a as toast } from "./Toaster.svelte_svelte_type_style_lang.js";
import { e as extractDockerErrorMessage } from "./errors.util.js";
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
export {
  handleApiResultWithCallbacks as h
};
