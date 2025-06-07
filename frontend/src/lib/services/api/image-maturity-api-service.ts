import BaseAPIService from './api-service';
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

export default class ImageAPIService extends BaseAPIService {
	async remove(id: string) {
		const res = await this.api.delete(`/images/${id}`);
		return res.data;
	}

	async pull(imageRef: string, tag: string) {
		const encodedImageRef = encodeURIComponent(imageRef);
		const res = await this.api.post(`/images/pull/${encodedImageRef}`, { tag });
		return res.data;
	}

	async prune() {
		const res = await this.api.post(`/images/prune`);
		return res.data;
	}

	async list() {
		const res = await this.api.get('/images');
		return res.data;
	}

	// Maturity-related methods
	async checkMaturity(id: string): Promise<ImageMaturity> {
		const res = await this.api.get(`/images/${id}/maturity`);
		return res.data;
	}

	async checkMaturityBatch(imageIds: string[]) {
		if (!imageIds || imageIds.length === 0) {
			throw new Error('No image IDs provided for batch check');
		}

		const firstId = imageIds[0];
		const res = await this.api.post(`/images/${firstId}/maturity`, { imageIds });
		return res.data;
	}

	async getMaturityStats() {
		const res = await this.api.get('/images/maturity/stats');
		return res.data;
	}

	async triggerManualMaturityCheck(force: boolean = false) {
		const res = await this.api.post('/images/maturity/manual-check', { force });
		return res.data;
	}

	async getImagesWithUpdates() {
		const res = await this.api.get('/images/maturity/updates');
		return res.data;
	}

	async markImageAsMatured(imageId: string, daysSinceCreation: number) {
		const res = await this.api.patch(`/images/${imageId}/maturity/mark-matured`, {
			daysSinceCreation
		});
		return res.data;
	}

	async invalidateImageMaturity(imageIds: string[]) {
		const res = await this.api.post('/images/maturity/invalidate', { imageIds });
		return res.data;
	}

	async cleanupOrphanedMaturityRecords(existingImageIds: string[]) {
		const res = await this.api.post('/images/maturity/cleanup', { existingImageIds });
		return res.data;
	}
}
