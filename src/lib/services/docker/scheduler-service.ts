import { getSettings } from '../settings-service';
import { checkAndUpdateContainers, checkAndUpdateStacks } from './auto-update-service';
import { cleanupService } from '$lib/services/database/cleanup-service';

// Track timers
let autoUpdateTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

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
 * Start the database cleanup scheduler
 */
export async function initCleanupScheduler(): Promise<void> {
	const settings = await getSettings();

	// Clear any existing timer
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
	}

	// Use a sensible default - run cleanup daily (24 hours)
	// You could add this to your settings if you want it configurable
	const intervalHours = 24; // Run daily
	const intervalMs = intervalHours * 60 * 60 * 1000;

	console.log(`Starting database cleanup scheduler with interval of ${intervalHours} hours`);

	// Schedule regular cleanup
	cleanupTimer = setInterval(runCleanupChecks, intervalMs);

	// Optional: Run initial cleanup after a short delay
	setTimeout(runCleanupChecks, 5 * 60 * 1000); // 5 minutes after startup
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
 * Run the database cleanup checks
 */
async function runCleanupChecks(): Promise<void> {
	console.log('🧹 Running scheduled database cleanup...');

	try {
		const result = await cleanupService.runCleanup();

		if (result.success) {
			console.log('✅ Scheduled cleanup completed successfully');
			console.log(`📊 Cleaned: ${result.summary.tasksRemoved} tasks, ${result.summary.metricsRemoved} metrics, ${result.summary.sessionsRemoved} sessions`);
		} else {
			console.error('⚠️ Scheduled cleanup completed with errors:', result.errors);
		}
	} catch (error) {
		console.error('❌ Scheduled cleanup failed:', error);
	}
}

/**
 * Stop the auto-update scheduler
 */
export async function stopAutoUpdateScheduler(): Promise<void> {
	if (autoUpdateTimer) {
		clearInterval(autoUpdateTimer);
		autoUpdateTimer = null;
		console.log('Auto-update scheduler stopped');
	}
}

/**
 * Stop the cleanup scheduler
 */
export async function stopCleanupScheduler(): Promise<void> {
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
		console.log('🧹 Database cleanup scheduler stopped');
	}
}

/**
 * Initialize all schedulers
 */
export async function initAllSchedulers(): Promise<void> {
	await initAutoUpdateScheduler();
	await initCleanupScheduler();
}

/**
 * Stop all schedulers
 */
export async function stopAllSchedulers(): Promise<void> {
	await stopAutoUpdateScheduler();
	await stopCleanupScheduler();
}
