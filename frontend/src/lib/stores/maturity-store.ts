import { writable } from 'svelte/store';
import type { ImageMaturity } from '$lib/types/docker/image.type';
import ImageAPIService from '$lib/services/api/image-api-service';
import ImageMaturityAPIService from '$lib/services/api/image-maturity-api-service';

export type MaturityState = {
	lastChecked: Date | null;
	maturityData: Record<string, ImageMaturity>;
	isChecking: boolean;
};

const initialState: MaturityState = {
	lastChecked: null,
	maturityData: {},
	isChecking: false
};

export const maturityStore = writable<MaturityState>(initialState);

const imageApi = new ImageAPIService();
const imageMaturityApi = new ImageMaturityAPIService();

// Function to update maturity for a specific image
export function updateImageMaturity(imageId: string, maturity: ImageMaturity | undefined): void {
	maturityStore.update((state) => {
		const newData = { ...state.maturityData };

		if (maturity) {
			newData[imageId] = maturity;
		} else {
			delete newData[imageId];
		}

		return {
			...state,
			maturityData: newData
		};
	});
}

// Update the checking status
export function setMaturityChecking(isChecking: boolean): void {
	maturityStore.update((state) => ({
		...state,
		isChecking,
		lastChecked: isChecking ? state.lastChecked : new Date()
	}));
}

// Load maturity data for a batch of images (from dashboard logic)
export async function loadImageMaturityBatch(imageIds: string[]): Promise<void> {
	if (imageIds.length === 0) return;

	try {
		const BATCH_SIZE = 2;
		for (let i = 0; i < imageIds.length; i += BATCH_SIZE) {
			const batch = imageIds.slice(i, i + BATCH_SIZE);
			await imageApi.checkMaturityBatch(batch);

			if (i + BATCH_SIZE < imageIds.length) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}
		}
	} catch (error) {
		console.error('Error loading maturity data batch:', error);
	}
}

// Load maturity data for top images (from dashboard logic)
export async function loadTopImagesMaturity(images: any[]): Promise<void> {
	if (!images || images.length === 0) return;

	const topImageIds = [...images]
		.sort((a, b) => (b.Size || 0) - (a.Size || 0))
		.slice(0, 5)
		.filter((img) => img.repo !== '<none>' && img.tag !== '<none>')
		.map((img) => img.Id);

	await loadImageMaturityBatch(topImageIds);
}

// Trigger bulk maturity check using the ImageMaturityAPIService
export async function triggerBulkMaturityCheck(): Promise<{ success: boolean; message: string }> {
	setMaturityChecking(true);

	try {
		const result = await imageMaturityApi.triggerMaturityCheck();

		if (result.success) {
			return { success: true, message: 'Maturity check completed successfully' };
		} else {
			return { success: false, message: 'Maturity check failed' };
		}
	} catch (error) {
		console.error('Bulk maturity check error:', error);
		return { success: false, message: 'Failed to trigger maturity check' };
	} finally {
		setMaturityChecking(false);
	}
}

// Enhanced image processing that includes maturity data from store
export function enhanceImagesWithMaturity(images: any[], maturityData: Record<string, ImageMaturity>): any[] {
	return images.map((image) => {
		// Parse repo and tag from RepoTags
		let repo = '<none>';
		let tag = '<none>';
		if (image.RepoTags && image.RepoTags.length > 0) {
			const repoTag = image.RepoTags[0];
			if (repoTag.includes(':')) {
				[repo, tag] = repoTag.split(':');
			} else {
				repo = repoTag;
				tag = 'latest';
			}
		}

		const storedMaturity = maturityData[image.Id];

		return {
			...image,
			repo,
			tag,
			inUse: image.Containers > 0,
			// Prioritize store data over image data
			maturity: storedMaturity !== undefined ? storedMaturity : image.maturity
		};
	});
}
