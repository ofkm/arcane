import { db } from '../../../db';
import { imageMaturityTable } from '../../../db/schema';
import { eq, lt, desc, asc, inArray, notInArray, sql } from 'drizzle-orm';
import type { ImageMaturity } from '$lib/types/docker/image.type';

export interface ImageMaturityRecord {
	id: string;
	repository: string;
	tag: string;
	currentVersion: string;
	latestVersion: string | null;
	status: 'Matured' | 'Not Matured' | 'Unknown';
	updatesAvailable: boolean;
	currentImageDate: Date | null;
	latestImageDate: Date | null;
	daysSinceCreation: number | null;
	registryDomain: string | null;
	isPrivateRegistry: boolean;
	lastChecked: Date;
	checkCount: number;
	lastError: string | null;
	responseTimeMs: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export class ImageMaturityDbService {
	/**
	 * Get maturity data for a single image
	 */
	async getImageMaturity(imageId: string): Promise<ImageMaturityRecord | null> {
		const result = await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.id, imageId)).limit(1);

		return result[0] || null;
	}

	/**
	 * Get maturity data for multiple images
	 */
	async getImageMaturityBatch(imageIds: string[]): Promise<Map<string, ImageMaturityRecord>> {
		const results = new Map<string, ImageMaturityRecord>();

		if (imageIds.length === 0) return results;

		const records = await db.select().from(imageMaturityTable).where(inArray(imageMaturityTable.id, imageIds));

		for (const record of records) {
			results.set(record.id, record);
		}

		return results;
	}

	/**
	 * Store or update maturity data for an image
	 */
	async setImageMaturity(
		imageId: string,
		repository: string,
		tag: string,
		maturity: ImageMaturity,
		metadata: {
			registryDomain?: string;
			isPrivateRegistry?: boolean;
			responseTimeMs?: number;
			error?: string;
			latestVersion?: string;
		} = {}
	): Promise<void> {
		const now = new Date();

		// Parse dates from maturity data
		let currentImageDate: Date | null = null;
		let daysSince: number | null = null;

		if (maturity.date && maturity.date !== 'Unknown date' && maturity.date !== 'Invalid date') {
			try {
				currentImageDate = new Date(maturity.date);
				if (!isNaN(currentImageDate.getTime())) {
					daysSince = Math.floor((now.getTime() - currentImageDate.getTime()) / (1000 * 60 * 60 * 24));
				} else {
					currentImageDate = null;
				}
			} catch {
				currentImageDate = null;
			}
		}

		const baseData = {
			id: imageId,
			repository,
			tag,
			currentVersion: maturity.version,
			latestVersion: maturity.updatesAvailable ? metadata.latestVersion || null : null, // Fix: use actual latest version
			status: maturity.status,
			updatesAvailable: maturity.updatesAvailable,
			currentImageDate,
			latestImageDate: null, // Simplified: don't handle latest image date
			daysSinceCreation: daysSince,
			registryDomain: metadata.registryDomain || null,
			isPrivateRegistry: metadata.isPrivateRegistry || false,
			lastChecked: now,
			lastError: metadata.error || null,
			responseTimeMs: metadata.responseTimeMs || null,
			updatedAt: now
		};

		// Use upsert (INSERT ... ON CONFLICT) to handle race conditions atomically
		await db
			.insert(imageMaturityTable)
			.values({
				...baseData,
				checkCount: 1,
				createdAt: now
			})
			.onConflictDoUpdate({
				target: imageMaturityTable.id,
				set: {
					...baseData,
					checkCount: sql`${imageMaturityTable.checkCount} + 1`,
					// Don't update createdAt on conflict - keep original value
					createdAt: sql`${imageMaturityTable.createdAt}`
				}
			});
	}

	/**
	 * Batch update multiple image maturity records
	 */
	async setImageMaturityBatch(
		updates: Array<{
			imageId: string;
			repository: string;
			tag: string;
			maturity: ImageMaturity;
			metadata?: {
				registryDomain?: string;
				isPrivateRegistry?: boolean;
				responseTimeMs?: number;
				error?: string;
				latestVersion?: string; // Add this field
			};
		}>
	): Promise<void> {
		if (updates.length === 0) return;

		// Process in batches to avoid SQL parameter limits
		const batchSize = 100;
		for (let i = 0; i < updates.length; i += batchSize) {
			const batch = updates.slice(i, i + batchSize);

			await Promise.all(batch.map(({ imageId, repository, tag, maturity, metadata }) => this.setImageMaturity(imageId, repository, tag, maturity, metadata || {})));
		}
	}

	/**
	 * Get images that need maturity checking based on last check time
	 */
	async getImagesNeedingCheck(maxAgeMinutes: number = 120, limit: number = 100): Promise<ImageMaturityRecord[]> {
		const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

		return await db.select().from(imageMaturityTable).where(lt(imageMaturityTable.lastChecked, cutoffTime)).orderBy(asc(imageMaturityTable.lastChecked)).limit(limit);
	}

	/**
	 * Get images with available updates
	 */
	async getImagesWithUpdates(): Promise<ImageMaturityRecord[]> {
		return await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.updatesAvailable, true)).orderBy(desc(imageMaturityTable.lastChecked));
	}

	/**
	 * Get images by repository
	 */
	async getImagesByRepository(repository: string): Promise<ImageMaturityRecord[]> {
		return await db.select().from(imageMaturityTable).where(eq(imageMaturityTable.repository, repository)).orderBy(desc(imageMaturityTable.lastChecked));
	}

	/**
	 * Delete maturity records for images that no longer exist
	 */
	async cleanupOrphanedRecords(existingImageIds: string[]): Promise<number> {
		if (existingImageIds.length === 0) {
			// If no images exist, clean up everything
			const result = await db.delete(imageMaturityTable);
			return result.rowsAffected || 0;
		}

		// Use notInArray for cleaner syntax
		const result = await db.delete(imageMaturityTable).where(notInArray(imageMaturityTable.id, existingImageIds));

		return result.rowsAffected || 0;
	}

	/**
	 * Clean up old records (older than specified days)
	 */
	async cleanupOldRecords(daysOld: number = 30): Promise<number> {
		const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

		const result = await db.delete(imageMaturityTable).where(lt(imageMaturityTable.lastChecked, cutoffTime));

		return result.rowsAffected || 0;
	}

	/**
	 * Invalidate maturity records by setting lastChecked to an old date
	 */
	async invalidateRecords(imageIds: string[]): Promise<number> {
		if (imageIds.length === 0) return 0;

		const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

		const result = await db
			.update(imageMaturityTable)
			.set({
				lastChecked: oldDate,
				updatedAt: new Date()
			})
			.where(inArray(imageMaturityTable.id, imageIds));

		return result.rowsAffected || 0;
	}

	/**
	 * Invalidate maturity records for a specific repository
	 */
	async invalidateRepository(repository: string): Promise<number> {
		const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

		const result = await db
			.update(imageMaturityTable)
			.set({
				lastChecked: oldDate,
				updatedAt: new Date()
			})
			.where(eq(imageMaturityTable.repository, repository));

		return result.rowsAffected || 0;
	}

	/**
	 * Get maturity statistics
	 */
	async getMaturityStats(): Promise<{
		total: number;
		withUpdates: number;
		matured: number;
		notMatured: number;
		unknown: number;
		averageAge: number;
		recentlyChecked: number;
	}> {
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		const oneHourAgoUnix = Math.floor(oneHourAgo.getTime() / 1000);

		const stats = await db
			.select({
				total: sql<number>`COUNT(*)`,
				withUpdates: sql<number>`SUM(CASE WHEN ${imageMaturityTable.updatesAvailable} = 1 THEN 1 ELSE 0 END)`,
				matured: sql<number>`SUM(CASE WHEN ${imageMaturityTable.status} = 'Matured' THEN 1 ELSE 0 END)`,
				notMatured: sql<number>`SUM(CASE WHEN ${imageMaturityTable.status} = 'Not Matured' THEN 1 ELSE 0 END)`,
				unknown: sql<number>`SUM(CASE WHEN ${imageMaturityTable.status} = 'Unknown' THEN 1 ELSE 0 END)`,
				avgDays: sql<number>`AVG(${imageMaturityTable.daysSinceCreation})`,
				recentlyChecked: sql<number>`SUM(CASE WHEN ${imageMaturityTable.lastChecked} > ${oneHourAgoUnix} THEN 1 ELSE 0 END)`
			})
			.from(imageMaturityTable);

		const result = stats[0];
		return {
			total: result.total || 0,
			withUpdates: result.withUpdates || 0,
			matured: result.matured || 0,
			notMatured: result.notMatured || 0,
			unknown: result.unknown || 0,
			averageAge: result.avgDays || 0,
			recentlyChecked: result.recentlyChecked || 0
		};
	}

	/**
	 * Convert database record to ImageMaturity format for backward compatibility
	 */
	recordToImageMaturity(record: ImageMaturityRecord): ImageMaturity {
		return {
			version: record.currentVersion,
			date: record.currentImageDate?.toLocaleDateString() || 'Unknown date',
			status: record.status,
			updatesAvailable: record.updatesAvailable
		};
	}
}

// Export singleton instance
export const imageMaturityDb = new ImageMaturityDbService();
