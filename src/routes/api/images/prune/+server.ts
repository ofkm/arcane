import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pruneImages } from '$lib/services/docker/image-service';
import { getSettings } from '$lib/services/settings-service';
import { formatBytes } from '$lib/utils';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async () => {
	const settingsResult = await tryCatch(getSettings());

	if (settingsResult.error) {
		console.error('Error getting settings:', settingsResult.error);

		const response: ApiErrorResponse = {
			success: false,
			error: 'Failed to retrieve settings',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: settingsResult.error
		};
		return json(response, { status: 500 });
	}

	const pruneMode = settingsResult.data.pruneMode;

	const pruneResult = await tryCatch(pruneImages(pruneMode));

	if (pruneResult.error) {
		console.error('Error pruning images:', pruneResult.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(pruneResult.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: pruneResult.error
		};
		return json(response, { status: 500 });
	}

	const result = pruneResult.data;
	const spaceReclaimedFormatted = formatBytes(result.SpaceReclaimed || 0);
	const message = result.ImagesDeleted && result.ImagesDeleted.length > 0 ? `Successfully pruned ${result.ImagesDeleted.length} image(s). Space reclaimed: ${spaceReclaimedFormatted}.` : `No unused images found to prune. Space reclaimed: ${spaceReclaimedFormatted}.`;

	return json({
		success: true,
		message: message,
		spaceReclaimed: result.SpaceReclaimed,
		imagesDeletedCount: result.ImagesDeleted?.length || 0
	});
};
