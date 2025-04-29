import fs from 'fs/promises';
import path from 'node:path';
import { randomBytes } from 'crypto';
import { getBasePath, getSettings } from './settings-service';
import type { UserSession } from '$lib/types/session.type';

// Session directory is under the same base path as settings
const SESSION_DIR = path.join(getBasePath(), 'sessions');

// In-memory session store
const sessions = new Map<string, UserSession>();

// Ensure session directory exists
async function ensureSessionDir() {
	await fs.mkdir(SESSION_DIR, { recursive: true });
}

// Create a new session
export async function createSession(userId: string, username: string): Promise<string> {
	const settings = await getSettings();
	const sessionId = randomBytes(32).toString('hex');
	const sessionData: UserSession = {
		userId,
		username,
		createdAt: Date.now(),
		lastAccessed: Date.now()
	};

	// Fallback to in-memory store
	sessions.set(sessionId, sessionData);
	return sessionId;
}

// Get a session by ID
export async function getSession(sessionId: string): Promise<UserSession | null> {
	const settings = await getSettings();

	// Check in-memory store
	const sessionData = sessions.get(sessionId);
	if (sessionData) {
		// Optionally check session expiry based on settings.auth?.sessionTimeout
		sessionData.lastAccessed = Date.now();
		return sessionData;
	}

	return null;
}

// Delete a session by ID
export async function deleteSession(sessionId: string): Promise<void> {
	const settings = await getSettings();

	// Remove from memory store
	sessions.delete(sessionId);
}

// Purge expired sessions (maintenance task)
export async function purgeExpiredSessions(): Promise<number> {
	try {
		await ensureSessionDir();
		const files = await fs.readdir(SESSION_DIR);
		let purgedCount = 0;

		for (const file of files) {
			if (!file.endsWith('.json')) continue;

			const filePath = path.join(SESSION_DIR, file);
			try {
				const sessionData = await fs.readFile(filePath, 'utf-8');
				const session = JSON.parse(sessionData) as UserSession;

				// Check if session has expired based on lastAccessed and settings
				const settings = await getSettings();
				const sessionTimeout = settings.auth?.sessionTimeout || 24 * 60 * 60 * 1000; // Default 24h
				if (Date.now() - session.lastAccessed > sessionTimeout) {
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
