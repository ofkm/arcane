import { getSettings } from '../settings-service';
import { checkAndUpdateContainers, checkAndUpdateStacks } from './auto-update-service';

// Track timers
let autoUpdateTimer: NodeJS.Timeout | null = null;

/**
 * Start the auto-update scheduler
 */
export async function initAutoUpdateScheduler(): Promise<void> {
	const settings = await getSettings();

	// Clear any existing timer
	if (autoUpdateTimer) {
		clearInterval(autoUpdateTimer);
		autoUpdateTimer = null;
	}

	// If auto-update is disabled globally, do nothing
	if (!settings.autoUpdate) {
		console.log('Auto-update is disabled in settings');
		return;
	}

	const intervalMinutes = settings.autoUpdateInterval || 60; // Default to 60 minutes
	const intervalMs = intervalMinutes * 60 * 1000;

	console.log(`Starting auto-update scheduler with interval of ${intervalMinutes} minutes`);

	// Initial run
	await runAutoUpdateChecks();

	// Schedule regular checks
	autoUpdateTimer = setInterval(runAutoUpdateChecks, intervalMs);
}

/**
 * Run the auto-update checks for containers and stacks
 */
async function runAutoUpdateChecks(): Promise<void> {
	console.log('Running scheduled auto-update checks...');

	try {
		// Check containers first
		const containerResults = await checkAndUpdateContainers();
		console.log(`Auto-update check completed for containers: Checked ${containerResults.checked}, Updated ${containerResults.updated}, Errors ${containerResults.errors.length}`);

		// Then check stacks
		const stackResults = await checkAndUpdateStacks();
		console.log(`Auto-update check completed for stacks: Checked ${stackResults.checked}, Updated ${stackResults.updated}, Errors ${stackResults.errors.length}`);
	} catch (error) {
		console.error('Error during auto-update check:', error);
	}
}

/**
 * Stop the auto-update scheduler
 */
export function stopAutoUpdateScheduler(): void {
	if (autoUpdateTimer) {
		clearInterval(autoUpdateTimer);
		autoUpdateTimer = null;
		console.log('Auto-update scheduler stopped');
	}
}
