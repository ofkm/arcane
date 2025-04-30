export function preventDefault(fn: (event: Event) => any) {
	return function (this: any, event: Event) {
		event.preventDefault();
		fn.call(this, event);
	};
}

// Helper function to get input values from the DOM
export function getInputValue(id: string, defaultValue = ''): string {
	const element = document.getElementById(id);
	if (!element || !(element instanceof HTMLInputElement)) {
		return defaultValue;
	}
	return element.value || defaultValue;
}
