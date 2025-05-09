import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { ensureStacksDir } from './stack-service';

export async function migrateStacksToNameFolders() {
	const stacksDir = await ensureStacksDir();
	const dirs = await fs.readdir(stacksDir);

	for (const dir of dirs) {
		const oldDirPath = path.join(stacksDir, dir);

		// Only process directories
		const stat = await fs.stat(oldDirPath);
		if (!stat.isDirectory()) continue;

		const metaPath = path.join(oldDirPath, 'meta.json');
		const newMetaPath = path.join(oldDirPath, '.stack.json');

		// Only migrate if meta.json exists and .stack.json does not
		try {
			await fs.access(metaPath);
		} catch {
			continue; // No meta.json, skip
		}
		try {
			await fs.access(newMetaPath);
			continue; // Already migrated
		} catch {}

		// Read and parse meta.json
		const metaRaw = await fs.readFile(metaPath, 'utf8');
		const meta = JSON.parse(metaRaw);

		// Generate new directory name
		const slug = slugify(meta.name, { lower: true, strict: true, trim: true });
		let newDirName = slug;
		let counter = 1;
		while (dirs.includes(newDirName) && newDirName !== dir) {
			newDirName = `${slug}-${counter++}`;
		}
		const newDirPath = path.join(stacksDir, newDirName);

		// Rename directory if needed
		if (newDirName !== dir) {
			await fs.rename(oldDirPath, newDirPath);
		}

		// Update and write .stack.json
		meta.dirName = newDirName;
		meta.path = newDirPath;
		await fs.writeFile(path.join(newDirPath, '.stack.json'), JSON.stringify(meta, null, 2), 'utf8');

		// Remove old meta.json
		await fs.rm(path.join(newDirPath, 'meta.json'));

		console.log(`Migrated stack "${meta.name}" to folder "${newDirName}"`);
	}
}
