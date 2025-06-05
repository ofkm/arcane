import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkImageMaturity, checkImageMaturityBatch } from '$lib/services/docker/image-service';
import { imageMaturityDb } from '$lib/services/database/image-maturity-db-service';
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
		console.log(`Server: Starting batch maturity check for ${imageIds.length} images`);

		const results = await checkImageMaturityBatch(imageIds);
		const errors: Record<string, string> = {};
		const successResults: Record<string, any> = {};

		let successCount = 0;
		let failCount = 0;

		for (const [imageId, maturity] of results) {
			if (maturity) {
				successResults[imageId] = maturity;
				successCount++;
			} else {
				errors[imageId] = 'No maturity data available';
				failCount++;
			}
		}

		console.log(`Server: Batch maturity check completed. ${successCount} successful, ${failCount} failed`);

		return json({
			success: true,
			results: successResults,
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

	try {
		const result = await checkImageMaturity(id);

		if (!result) {
			const response: ApiErrorResponse = {
				success: false,
				error: 'No maturity data available for this image',
				code: ApiErrorCode.NOT_FOUND
			};
			return json(response, { status: 404 });
		}

		return json({
			success: true,
			result
		});
	} catch (error) {
		console.error('Error checking image maturity:', error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: error
		};
		return json(response, { status: 500 });
	}
};

// New endpoint for getting maturity statistics
export const OPTIONS: RequestHandler = async () => {
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
