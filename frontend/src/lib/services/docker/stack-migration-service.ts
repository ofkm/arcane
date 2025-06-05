import fs from 'node:fs/promises';
import path from 'node:path';
import slugify from 'slugify';
import { ensureStacksDir, stopStack, startStack, isStackRunning } from './stack-custom-service';

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
		} catch {
			// intentionally empty, means .stack.json does not exist
		}

		// Check if stack is running before migration
		let wasRunning = false;
		try {
			wasRunning = await isStackRunning(dir);
		} catch {
			wasRunning = false;
		}

		// Stop the stack before migration
		try {
			await stopStack(dir);
			console.log(`Stopped stack "${dir}" before migration.`);
		} catch (err) {
			console.warn(`Failed to stop stack "${dir}" before migration:`, err);
		}

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

		// Migrate docker-compose.yml to compose.yaml if needed
		try {
			await fs.access(path.join(newDirPath, 'docker-compose.yml'));
			try {
				await fs.access(path.join(newDirPath, 'compose.yaml'));
				// compose.yaml already exists, do nothing
			} catch {
				await fs.rename(path.join(newDirPath, 'docker-compose.yml'), path.join(newDirPath, 'compose.yaml'));
				console.log(`Migrated docker-compose.yml to compose.yaml in "${newDirName}"`);
			}
		} catch {
			// docker-compose.yml does not exist, nothing to do
		}

		// Update and write .stack.json
		meta.dirName = newDirName;
		meta.path = newDirPath;
		await fs.writeFile(path.join(newDirPath, '.stack.json'), JSON.stringify(meta, null, 2), 'utf8');

		// Remove old meta.json
		await fs.rm(path.join(newDirPath, 'meta.json'));

		console.log(`Migrated stack "${meta.name}" to folder "${newDirName}"`);

		// Start the stack after migration if it was running before
		if (wasRunning) {
			try {
				await startStack(newDirName);
				console.log(`Started stack "${newDirName}" after migration.`);
			} catch (err) {
				console.warn(`Failed to start stack "${newDirName}" after migration:`, err);
			}
		}
	}
}

export async function migrateStackToNameFolder(stackId: string): Promise<void> {
	const stacksDir = await ensureStacksDir();
	const oldDirPath = path.join(stacksDir, stackId);

	// Only process if directory exists
	const stat = await fs.stat(oldDirPath);
	if (!stat.isDirectory()) throw new Error(`Stack directory "${stackId}" does not exist`);

	const metaPath = path.join(oldDirPath, 'meta.json');
	const newMetaPath = path.join(oldDirPath, '.stack.json');

	// Only migrate if meta.json exists and .stack.json does not
	try {
		await fs.access(metaPath);
	} catch {
		throw new Error(`No meta.json found for stack "${stackId}"`);
	}
	try {
		await fs.access(newMetaPath);
		throw new Error(`Stack "${stackId}" is already migrated`);
	} catch {
		// intentionally empty, means .stack.json does not exist
	}

	// Check if stack is running before migration
	let wasRunning = false;
	try {
		wasRunning = await isStackRunning(stackId);
	} catch {
		wasRunning = false;
	}

	// Stop the stack before migration
	try {
		await stopStack(stackId);
		console.log(`Stopped stack "${stackId}" before migration.`);
	} catch (err) {
		console.warn(`Failed to stop stack "${stackId}" before migration:`, err);
	}

	// Read and parse meta.json
	const metaRaw = await fs.readFile(metaPath, 'utf8');
	const meta = JSON.parse(metaRaw);

	// Generate new directory name
	const slug = slugify(meta.name, { lower: true, strict: true, trim: true });
	let newDirName = slug;
	let counter = 1;
	const dirs = await fs.readdir(stacksDir);
	while (dirs.includes(newDirName) && newDirName !== stackId) {
		newDirName = `${slug}-${counter++}`;
	}
	const newDirPath = path.join(stacksDir, newDirName);

	// Rename directory if needed
	if (newDirName !== stackId) {
		await fs.rename(oldDirPath, newDirPath);
	}

	// Migrate docker-compose.yml to compose.yaml if needed
	try {
		await fs.access(path.join(newDirPath, 'docker-compose.yml'));
		try {
			await fs.access(path.join(newDirPath, 'compose.yaml'));
			// compose.yaml already exists, do nothing
		} catch {
			await fs.rename(path.join(newDirPath, 'docker-compose.yml'), path.join(newDirPath, 'compose.yaml'));
			console.log(`Migrated docker-compose.yml to compose.yaml in "${newDirName}"`);
		}
	} catch {
		// docker-compose.yml does not exist, nothing to do
	}

	// Update and write .stack.json
	meta.dirName = newDirName;
	meta.path = newDirPath;
	await fs.writeFile(path.join(newDirPath, '.stack.json'), JSON.stringify(meta, null, 2), 'utf8');

	// Remove old meta.json
	await fs.rm(path.join(newDirPath, 'meta.json'));

	console.log(`Migrated stack "${meta.name}" to folder "${newDirName}"`);

	// Start the stack after migration if it was running before
	if (wasRunning) {
		try {
			await startStack(newDirName);
			console.log(`Started stack "${newDirName}" after migration.`);
		} catch (err) {
			console.warn(`Failed to start stack "${newDirName}" after migration:`, err);
		}
	}
}
