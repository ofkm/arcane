import { dev } from '$app/environment';
import { handleSession } from 'svelte-kit-cookie-session';
import { getSettings } from './settings-service';
import { createHash } from 'node:crypto';

// Get settings for session configuration
const settings = await getSettings();
const sessionTimeout = settings.auth?.sessionTimeout || 60; // minutes

// Ensure the secret is exactly 32 bytes by hashing it
function createSecret(input: string): Uint8Array {
	// Hash the input using SHA-256 to get exactly 32 bytes
	const hash = createHash('sha256').update(input).digest();
	return new Uint8Array(hash);
}

// Get secret from environment or use a development fallback
const secretInput = dev ? 'bGfEmnahwCaNznqB9pPPXUjouFoe89jk' : process.env.SESSION_SECRET || 'fallback-secret-do-not-use-in-production';

// Create properly sized secret
const secret = createSecret(secretInput);

export const sessionHandler = handleSession({
	// Use the properly sized secret
	secret,
	expires: sessionTimeout * 60, // Convert to seconds
	cookie: {
		path: '/',
		httpOnly: true,
		sameSite: 'lax'
	}
});
