import { dev } from '$app/environment';

// Simply use SvelteKit's built-in dev flag
export const isDev = dev;

// For test environment, we can use a safer approach
export const isTest = false; // Default for browser
