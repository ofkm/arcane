import { promises as fs } from 'node:fs';

/**
 * Helper function to check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch (err) {
		return false;
	}
}

export async function directoryExists(dir: string): Promise<boolean> {
	try {
		const stats = await fs.stat(dir);
		return stats.isDirectory();
	} catch (err) {
		return false;
	}
}
