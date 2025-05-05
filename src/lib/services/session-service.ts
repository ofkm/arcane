import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { encrypt, decrypt } from './encryption-service';
import { SESSIONS_DIR, ensureDirectory } from './paths-service';
import type { UserSession } from '$lib/types/session.type';

// Create a Map to store sessions in memory
const sessions = new Map<string, string>();

// Create a session directory if it doesn't exist
async function ensureSessionDir() {
	await ensureDirectory(SESSIONS_DIR, 0o700);
}

// Create a new session with encryption
export async function createSession(userId: string, username: string): Promise<string> {
	const sessionId = crypto.randomBytes(32).toString('hex');

	// Get session timeout from settings
	const { auth } = await import('$lib/services/settings-service').then((m) => m.getSettings());
	const sessionTimeout = auth?.sessionTimeout ?? 1440; // 24 hours in minutes
	const expiryTime = Date.now() + sessionTimeout * 60 * 1000;

	// Create session data with explicit expiry time
	const sessionData: UserSession = {
		userId,
		username,
		createdAt: Date.now(),
		lastAccessed: Date.now(),
		expires: expiryTime
	};

	// Encrypt session data before storing
	const encryptedData = await encryptSessionData(sessionData);

	// Store encrypted data
	sessions.set(sessionId, encryptedData);

	// Also save to disk for persistence across restarts
	await saveSessionToDisk(sessionId, encryptedData);

	return sessionId;
}

// Helper function to encrypt session data
async function encryptSessionData(data: UserSession): Promise<string> {
	return encrypt(data);
}

// Helper function to decrypt session data
async function decryptSessionData(encryptedData: string): Promise<UserSession> {
	return await decrypt(encryptedData);
}

// Get a session by ID
export async function getSession(sessionId: string): Promise<UserSession | null> {
	// Check in-memory store
	const encryptedData = sessions.get(sessionId);
	if (encryptedData) {
		try {
			// Decrypt the session data
			const sessionData = await decryptSessionData(encryptedData);

			// Get current settings for session timeout
			const { auth } = await import('$lib/services/settings-service').then((m) => m.getSettings());
			const sessionTimeout = auth?.sessionTimeout ?? 1440; // 24 hours in minutes
			const maxAge = sessionTimeout * 60 * 1000; // Convert to milliseconds

			// Check if session has expired - first check explicit expiry if it exists
			if (sessionData.expires && Date.now() > sessionData.expires) {
				console.log('Session expired (explicit expiry):', sessionId);
				sessions.delete(sessionId);
				await removeSessionFromDisk(sessionId);
				return null;
			}

			// Fall back to lastAccessed-based expiry if no explicit expires field
			if (!sessionData.expires && Date.now() - sessionData.lastAccessed > maxAge) {
				console.log('Session expired (activity timeout):', sessionId);
				sessions.delete(sessionId);
				await removeSessionFromDisk(sessionId);
				return null;
			}

			// Session is valid - update last accessed time and extend expiry
			sessionData.lastAccessed = Date.now();

			// Always update the expiry time on each access (sliding expiration)
			sessionData.expires = Date.now() + maxAge;

			// Re-encrypt with updated timestamp and store
			const updatedEncrypted = await encryptSessionData(sessionData);
			sessions.set(sessionId, updatedEncrypted);

			// Save to disk asynchronously
			saveSessionToDisk(sessionId, updatedEncrypted).catch((err) => console.error('Failed to save session to disk:', err));

			return sessionData;
		} catch (error) {
			console.error('Error decrypting session:', error);
			return null;
		}
	}

	// Try to load from disk
	try {
		const encryptedFromDisk = await loadSessionFromDisk(sessionId);
		if (encryptedFromDisk) {
			// Store in memory for future access
			sessions.set(sessionId, encryptedFromDisk);
			// Now process as if it was found in memory
			return await getSession(sessionId);
		}
	} catch (error) {
		console.error('Error loading session from disk:', error);
	}

	return null;
}

// Delete a session by ID
export async function deleteSession(sessionId: string): Promise<void> {
	// Remove from memory store
	sessions.delete(sessionId);
	await removeSessionFromDisk(sessionId);
}

// Purge expired sessions (maintenance task)
export async function purgeExpiredSessions(): Promise<number> {
	try {
		await ensureSessionDir();
		const files = await fs.readdir(SESSIONS_DIR);
		let purgedCount = 0;

		for (const file of files) {
			if (!file.endsWith('.dat')) continue;

			const filePath = path.join(SESSIONS_DIR, file);
			try {
				const encryptedData = await fs.readFile(filePath, 'utf-8');
				const sessionData = await decryptSessionData(encryptedData);

				// Check if session has expired - prefer explicit expiry time
				if ((sessionData.expires && Date.now() > sessionData.expires) || (!sessionData.expires && Date.now() - sessionData.lastAccessed > 24 * 60 * 60 * 1000)) {
					await fs.unlink(filePath);
					purgedCount++;
				}
			} catch (error) {
				// Skip problematic files
			}
		}

		return purgedCount;
	} catch (error) {
		console.error('Error purging sessions:', error);
		return 0;
	}
}

// Save session to disk
async function saveSessionToDisk(sessionId: string, encryptedData: string): Promise<void> {
	await ensureSessionDir();
	const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.dat`);
	await fs.writeFile(sessionFile, encryptedData, { mode: 0o600 });
}

// Helper function to load session from disk
async function loadSessionFromDisk(sessionId: string): Promise<string | null> {
	const filePath = path.join(SESSIONS_DIR, `${sessionId}.dat`);
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch {
		return null;
	}
}

// Helper function to remove session from disk
async function removeSessionFromDisk(sessionId: string): Promise<void> {
	const filePath = path.join(SESSIONS_DIR, `${sessionId}.dat`);
	try {
		await fs.unlink(filePath);
	} catch {
		// Ignore errors
	}
}
