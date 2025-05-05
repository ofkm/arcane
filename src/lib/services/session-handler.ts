import { handleSession } from 'svelte-kit-cookie-session';
import { getSettings } from './settings-service';
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';

const settings = await getSettings();
const sessionTimeout = settings.auth?.sessionTimeout || 60;

function createSecret(input: string): Uint8Array {
	const hash = createHash('sha256').update(input).digest();
	return new Uint8Array(hash);
}

const secretInput = env.PUBLIC_SESSION_SECRET;

if (!secretInput) {
	throw new Error('PUBLIC_SESSION_SECRET is missing in ENV.');
}

const secret = createSecret(secretInput);

export const sessionHandler = handleSession({
	secret,
	expires: sessionTimeout * 60,
	cookie: {
		path: '/',
		httpOnly: true,
		sameSite: 'lax'
	}
});
