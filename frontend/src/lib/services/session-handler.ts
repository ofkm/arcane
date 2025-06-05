import type { Handle } from '@sveltejs/kit';

// Simple pass-through handler that just preserves cookies
// All session management is handled by the Go backend
export const sessionHandler: Handle = async ({ event, resolve }) => {
	// Just pass through all requests - the backend handles session management
	// Cookies are automatically forwarded via the browser
	return resolve(event);
};
