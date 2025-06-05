import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listImages } from '$lib/services/docker/image-service';
import { imageMaturityDb } from '$lib/services/database/image-maturity-db-service';
import { checkImageMaturityBatch } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const { force = false } = body; // Force check even if recently checked

		console.log('Manual maturity check triggered', { force });

		// Get all images
		const imagesResult = await tryCatch(listImages());
		if (imagesResult.error) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'Failed to list Docker images',
				code: ApiErrorCode.DOCKER_API_ERROR,
				details: imagesResult.error
			};
			return json(response, { status: 500 });
		}

		const images = imagesResult.data;
		const validImages = images.filter((image) => image.repo !== '<none>' && image.tag !== '<none>');

		if (validImages.length === 0) {
			return json({
				success: true,
				message: 'No valid images found to check',
				stats: { total: 0, checked: 0, updated: 0 }
			});
		}

		const imageIds = validImages.map((img) => img.Id);
		let imageIdsToCheck = imageIds;

		// If not forcing, only check images that need checking
		if (!force) {
			const imagesToCheck = await imageMaturityDb.getImagesNeedingCheck(120, 1000); // 2 hours, up to 1000 images
			const imageIdsNeedingCheck = new Set(imagesToCheck.map((record) => record.id));

			// FIXED: Use single batch query instead of N+1 queries
			const existingMaturityRecords = await imageMaturityDb.getImageMaturityBatch(imageIds);

			// Add any images not in database yet to the checking set
			for (const imageId of imageIds) {
				if (!existingMaturityRecords.has(imageId)) {
					imageIdsNeedingCheck.add(imageId);
				}
			}

			imageIdsToCheck = imageIds.filter((id) => imageIdsNeedingCheck.has(id));
		}

		console.log(`Checking maturity for ${imageIdsToCheck.length} of ${imageIds.length} images`);

		// Process in batches
		const batchSize = 20;
		let totalChecked = 0;
		let totalUpdated = 0;

		for (let i = 0; i < imageIdsToCheck.length; i += batchSize) {
			const batch = imageIdsToCheck.slice(i, i + batchSize);
			const results = await checkImageMaturityBatch(batch);

			totalChecked += batch.length;
			totalUpdated += Array.from(results.values()).filter((maturity) => maturity?.updatesAvailable).length;

			// Small delay between batches
			if (i + batchSize < imageIdsToCheck.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}

		// Get final stats
		const stats = await imageMaturityDb.getMaturityStats();

		return json({
			success: true,
			message: `Checked ${totalChecked} images, found ${totalUpdated} with updates`,
			stats: {
				...stats,
				total: imageIds.length,
				checked: totalChecked,
				updated: totalUpdated
			}
		});
	} catch (error) {
		console.error('Error in manual maturity check:', error);

		const response: ApiErrorResponse = {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: error
		};
		return json(response, { status: 500 });
	}
};

export const GET: RequestHandler = async () => {
	try {
		const stats = await imageMaturityDb.getMaturityStats();
		return json({
			success: true,
			stats
		});
	} catch (error) {
		console.error('Error getting maturity stats:', error);
		return json(
			{
				success: false,
				error: 'Failed to get maturity statistics'
			},
			{ status: 500 }
		);
	}
};
