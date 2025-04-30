export function preventDefault(fn: (event: Event) => any) {
	return function (this: any, event: Event) {
		event.preventDefault();
		fn.call(this, event);
	};
}
