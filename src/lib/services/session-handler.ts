import { handleSession } from 'svelte-kit-cookie-session';
import { getSettings } from './settings-service';
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';

const settings = await getSettings();
// Use a longer default timeout (e.g., 24 hours in minutes)
const sessionTimeout = settings.auth?.sessionTimeout || 1440;

function createSecret(input: string): Uint8Array {
	const hash = createHash('sha256').update(input).digest();
	return new Uint8Array(hash);
}

const secretInput = env.PUBLIC_SESSION_SECRET;

if (!secretInput) {
	throw new Error('PUBLIC_SESSION_SECRET is missing in ENV.');
}

const secret = createSecret(secretInput);

// Determine if secure cookies should be used
// Secure cookies should be used UNLESS explicitly allowed to be insecure OR in dev mode
const useSecureCookie = !(env.PUBLIC_ALLOW_INSECURE_COOKIES === 'true' || dev);

export const sessionHandler = handleSession({
	secret,
	// expires is session lifetime in seconds
	expires: sessionTimeout * 60,
	// rolling: 'session', // Optionally enable rolling sessions
	cookie: {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: useSecureCookie
	}
});
