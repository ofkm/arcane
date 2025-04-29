import { dev } from '$app/environment';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import proper from 'proper-lockfile';
import { getBasePath, getSettings } from './settings-service';
import { isValKeyConnected, getValue, setValue } from './valkey-service';
import type { User } from './user-service';

// Session directory is under the same base path as settings
const SESSION_DIR = path.join(getBasePath(), 'sessions');

export interface Session {
	id: string;
	userId: string;
	username: string;
	created: string;
	expires: string;
	ip?: string;
	userAgent?: string;
}

// Ensure session directory exists
async function ensureSessionDir() {
	await fs.mkdir(SESSION_DIR, { recursive: true });
}

// Create a new session
export async function createSession(user: User, ip?: string, userAgent?: string): Promise<Session> {
	const settings = await getSettings();
	const sessionTimeout = settings.auth?.sessionTimeout || 60; // minutes

	const session: Session = {
		id: nanoid(32),
		userId: user.id,
		username: user.username,
		created: new Date().toISOString(),
		expires: new Date(Date.now() + sessionTimeout * 60 * 1000).toISOString(),
		ip,
		userAgent
	};

	// Try to use Valkey/Redis for sessions if enabled and connected
	if (isValKeyConnected()) {
		const keyPrefix = settings.externalServices?.valkey?.keyPrefix || 'arcane:';
		await setValue(`${keyPrefix}session:${session.id}`, JSON.stringify(session));
		return session;
	}

	// Fall back to file storage
	await ensureSessionDir();
	const filePath = path.join(SESSION_DIR, `${session.id}.json`);
	await fs.writeFile(filePath, JSON.stringify(session, null, 2));

	return session;
}

// Get a session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
	try {
		// Check Valkey/Redis first if it's connected
		if (isValKeyConnected()) {
			const settings = await getSettings();
			const keyPrefix = settings.externalServices?.valkey?.keyPrefix || 'arcane:';
			const sessionData = await getValue(`${keyPrefix}session:${sessionId}`);

			if (sessionData) {
				const session = JSON.parse(sessionData) as Session;
				// Check if session is expired
				if (new Date(session.expires) < new Date()) {
					return null;
				}
				return session;
			}
		}

		// Fall back to file storage
		await ensureSessionDir();
		const filePath = path.join(SESSION_DIR, `${sessionId}.json`);

		try {
			const sessionData = await fs.readFile(filePath, 'utf-8');
			const session = JSON.parse(sessionData) as Session;

			// Check if session is expired
			if (new Date(session.expires) < new Date()) {
				await fs.unlink(filePath).catch(() => {});
				return null;
			}

			return session;
		} catch (error) {
			return null;
		}
	} catch (error) {
		console.error('Error getting session:', error);
		return null;
	}
}

// Delete a session by ID
export async function deleteSession(sessionId: string): Promise<void> {
	// Try Valkey/Redis first if connected
	if (isValKeyConnected()) {
		const settings = await getSettings();
		const keyPrefix = settings.externalServices?.valkey?.keyPrefix || 'arcane:';
		await setValue(`${keyPrefix}session:${sessionId}`, '');
	}

	// Also try file storage in case we switched between approaches
	try {
		await ensureSessionDir();
		const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
		await fs.unlink(filePath).catch(() => {});
	} catch (error) {
		console.error('Error deleting session:', error);
	}
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
				const session = JSON.parse(sessionData) as Session;

				if (new Date(session.expires) < new Date()) {
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
