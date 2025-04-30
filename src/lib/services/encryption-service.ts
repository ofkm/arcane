import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { KEY_FILE, ensureDirectory } from './paths-service';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

// Promisify pbkdf2 for async use
const pbkdf2Async = promisify(crypto.pbkdf2);

// Get or generate a secret key for the application
export async function getSecretKey(): Promise<Buffer> {
	try {
		// Try to read existing key
		await fs.access(KEY_FILE);
		const keyData = await fs.readFile(KEY_FILE);
		return keyData;
	} catch (error) {
		// Check specifically for "file not found" error
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			// No key exists, generate one
			console.log('Generating new encryption key...');
			const key = crypto.randomBytes(KEY_LENGTH);

			// Ensure directory exists - use imported path module
			await ensureDirectory(path.dirname(KEY_FILE), 0o700);

			// Save with restricted permissions
			await fs.writeFile(KEY_FILE, key, { mode: 0o600 }); // Only owner can read/write
			return key;
		}

		// Rethrow any other errors (permissions, disk failures, etc.)
		console.error('Error accessing encryption key:', error);
		throw error;
	}
}

// Encrypt any data
export async function encrypt(data: any): Promise<string> {
	const secretKey = await getSecretKey();
	const iv = crypto.randomBytes(16);
	const salt = crypto.randomBytes(SALT_LENGTH);

	// Derive key from master key and salt (asynchronously)
	const key = await pbkdf2Async(secretKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

	let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
	encrypted += cipher.final('hex');

	const authTag = cipher.getAuthTag();

	// Format: salt:iv:authTag:encrypted
	return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt data
export async function decrypt(encryptedData: string): Promise<any> {
	const secretKey = await getSecretKey();
	const parts = encryptedData.split(':');
	if (parts.length !== 4) throw new Error('Invalid encrypted data format');

	const salt = Buffer.from(parts[0], 'hex');
	const iv = Buffer.from(parts[1], 'hex');
	const authTag = Buffer.from(parts[2], 'hex');
	const encrypted = parts[3];

	// Derive the same key using the stored salt (asynchronously)
	const key = await pbkdf2Async(secretKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');

	return JSON.parse(decrypted);
}
