import { promises as fs } from 'node:fs';

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

export async function directoryExists(dir: string): Promise<boolean> {
	try {
		const stats = await fs.stat(dir);
		return stats.isDirectory();
	} catch {
		return false;
	}
}
