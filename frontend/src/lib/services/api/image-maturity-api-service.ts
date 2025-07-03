import BaseAPIService from './api-service';
import type { ImageMaturity } from '$lib/models/image.type';

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

export interface MaturityStats {
	total: number;
	withUpdates: number;
	matured: number;
	notMatured: number;
	unknown: number;
	averageAge: number;
	recentlyChecked: number;
}

export interface BatchMaturityResult {
	success: boolean;
	results: Record<string, ImageMaturity>;
	errors: Record<string, string>;
	stats: {
		total: number;
		success: number;
		failed: number;
	};
}

export interface ManualCheckResult {
	success: boolean;
	message: string;
	stats: MaturityStats & {
		total: number;
		checked: number;
		updated: number;
	};
}

export default class ImageMaturityAPIService extends BaseAPIService {
	async checkMaturity(id: string): Promise<ImageMaturity> {
		const res = await this.api.get(`/images/maturity/${id}`);
		return res.data;
	}

	// Get all maturity records
	async listMaturityRecords(): Promise<ImageMaturityRecord[]> {
		const res = await this.api.get('/images/maturity');
		return res.data;
	}

	// Get maturity statistics
	async getMaturityStats(): Promise<MaturityStats> {
		const res = await this.api.get('/images/maturity/stats');
		return res.data;
	}

	// Get images with available updates
	async getImagesWithUpdates(): Promise<ImageMaturityRecord[]> {
		const res = await this.api.get('/images/maturity/updates');
		return res.data;
	}

	// Get images needing check
	async getImagesNeedingCheck(maxAge: number = 1440, limit: number = 100): Promise<ImageMaturityRecord[]> {
		const res = await this.api.get('/images/maturity/needs-check', {
			params: { maxAge, limit }
		});
		return res.data;
	}

	// Trigger maturity check for all images
	async triggerMaturityCheck(imageIds?: string[]): Promise<{ success: boolean; message: string }> {
		const payload = imageIds && imageIds.length > 0 ? { imageIds } : {};
		const res = await this.api.post('/images/maturity/check', payload);
		return res.data;
	}

	// Get maturity records by repository
	async getMaturityByRepository(repository: string): Promise<ImageMaturityRecord[]> {
		const encodedRepository = encodeURIComponent(repository);
		const res = await this.api.get(`/images/maturity/repository/${encodedRepository}`);
		return res.data;
	}

	// Legacy methods - keeping for backward compatibility but marking as deprecated

	/**
	 * @deprecated Use triggerMaturityCheck() instead
	 */
	async triggerManualMaturityCheck(force: boolean = false): Promise<ManualCheckResult> {
		console.warn('triggerManualMaturityCheck is deprecated, use triggerMaturityCheck instead');
		const res = await this.api.post('/images/maturity/check', { force });
		return res.data;
	}

	/**
	 * @deprecated Use triggerMaturityCheck() instead - batch checking is now handled automatically
	 */
	async checkMaturityBatch(imageIds: string[]): Promise<BatchMaturityResult> {
		console.warn('checkMaturityBatch is deprecated, use triggerMaturityCheck for all images');
		if (!imageIds || imageIds.length === 0) {
			throw new Error('No image IDs provided for batch check');
		}

		// Fallback: trigger general maturity check
		const result = await this.triggerMaturityCheck();
		return {
			success: result.success,
			results: {},
			errors: {},
			stats: {
				total: imageIds.length,
				success: result.success ? imageIds.length : 0,
				failed: result.success ? 0 : imageIds.length
			}
		};
	}
}
