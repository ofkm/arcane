/**
 * Cleanup Scheduler
 * Handles automatic database cleanup scheduling
 */

import { cleanupService } from './cleanup-service';
import { getSettings } from '../settings-service';

class CleanupScheduler {
	private timer: NodeJS.Timeout | null = null;
	private isRunning = false;

	/**
	 * Start the cleanup scheduler
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.log('⚠️ Cleanup scheduler is already running');
			return;
		}

		try {
			const settings = await getSettings();

			// Default to run cleanup every 24 hours
			const intervalHours = 24;

			console.log(`🚀 Starting cleanup scheduler (every ${intervalHours} hours)`);

			// Run initial cleanup
			await this.runCleanup();

			// Schedule recurring cleanup
			this.timer = setInterval(
				async () => {
					await this.runCleanup();
				},
				intervalHours * 60 * 60 * 1000
			);

			this.isRunning = true;
			console.log('✅ Cleanup scheduler started');
		} catch (error) {
			console.error('❌ Failed to start cleanup scheduler:', error);
			throw error;
		}
	}

	/**
	 * Stop the cleanup scheduler
	 */
	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}

		this.isRunning = false;
		console.log('🛑 Cleanup scheduler stopped');
	}

	/**
	 * Run cleanup with error handling
	 */
	private async runCleanup(): Promise<void> {
		try {
			console.log('🧹 Running scheduled database cleanup...');

			const result = await cleanupService.runCleanup();

			if (result.success) {
				console.log('✅ Scheduled cleanup completed successfully');
				console.log('📊 Summary:', result.summary);
			} else {
				console.error('⚠️ Scheduled cleanup completed with errors:', result.errors);
			}
		} catch (error) {
			console.error('❌ Scheduled cleanup failed:', error);
		}
	}

	/**
	 * Check if scheduler is running
	 */
	isSchedulerRunning(): boolean {
		return this.isRunning;
	}
}

export const cleanupScheduler = new CleanupScheduler();
