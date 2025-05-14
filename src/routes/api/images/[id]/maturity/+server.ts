import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkImageMaturity } from '$lib/services/docker/image-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { imageIds } = body;

	if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Image IDs array is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	try {
		// Server-side promise pool with concurrency limit
		const concurrencyLimit = 5; // Process 5 images at a time
		const results: Record<string, any> = {};
		const pending = new Set();
		const errors: Record<string, string> = {};

		// Create a queue from all images that need checking
		const queue = [...imageIds];

		// Process queue with limited concurrency
		while (queue.length > 0 || pending.size > 0) {
			// Fill up the pending set until we reach the concurrency limit
			while (pending.size < concurrencyLimit && queue.length > 0) {
				const imageId = queue.shift();
				if (!imageId) continue;

				// Create the promise for this image check
				const promise = (async () => {
					try {
						console.log(`Server: Checking maturity for image ${imageId}`);
						const checkResult = await tryCatch(checkImageMaturity(imageId));

						if (checkResult.error) {
							return {
								imageId,
								success: false,
								error: extractDockerErrorMessage(checkResult.error)
							};
						}

						return { imageId, success: true, data: checkResult.data };
					} catch (error) {
						console.error(`Server: Failed to check maturity for ${imageId}:`, error);
						return {
							imageId,
							success: false,
							error: error instanceof Error ? error.message : 'Unknown error'
						};
					}
				})();

				// Add to pending set and set up cleanup when done
				pending.add(promise);
				promise.then((result) => {
					pending.delete(promise);

					if (result.success) {
						results[result.imageId] = result.data;
					} else {
						errors[result.imageId] = result.error ?? 'Unknown error';
					}
				});
			}

			// Wait for at least one promise to resolve before continuing
			if (pending.size >= concurrencyLimit || (queue.length === 0 && pending.size > 0)) {
				await Promise.race(Array.from(pending));
			}
		}

		const successCount = Object.keys(results).length;
		const failCount = Object.keys(errors).length;

		console.log(`Server: Maturity check completed. ${successCount} successful, ${failCount} failed`);

		return json({
			success: true,
			results,
			errors,
			stats: {
				total: imageIds.length,
				success: successCount,
				failed: failCount
			}
		});
	} catch (error) {
		console.error('Server: Error in batch maturity check:', error);

		const response: ApiErrorResponse = {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: error
		};
		return json(response, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	if (!id) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Image ID is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const result = await tryCatch(checkImageMaturity(id));

	if (result.error) {
		console.error('Error checking image maturity:', result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	return json({
		success: true,
		result
	});
};
