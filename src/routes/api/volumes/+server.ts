import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createVolume, listVolumes } from '$lib/services/docker/volume-service';
import type { VolumeCreateOptions, VolumeInspectInfo } from 'dockerode';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async () => {
	const volumesResult = await tryCatch(listVolumes());

	if (volumesResult.error) {
		console.error('API Error fetching volumes:', volumesResult.error);
		const typedError = volumesResult.error as any;
		const response: ApiErrorResponse = {
			success: false,
			error: typedError.message || 'Failed to fetch volumes',
			code: typedError.code || ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: typedError.details || typedError
		};
		const status = typeof typedError.statusCode === 'number' ? typedError.statusCode : 500;
		return json(response, { status });
	}

	return json(volumesResult.data, { status: 200 });
};

export const POST: RequestHandler = async ({ request }) => {
	const bodyResult = await tryCatch(request.json());
	if (bodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}
	const body: VolumeCreateOptions = bodyResult.data;

	if (!body.Name) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Volume name (Name) is required.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const volumeResult = await tryCatch(createVolume(body));

	if (volumeResult.error) {
		console.error('API Error creating volume:', volumeResult.error);
		const typedError = volumeResult.error as any;
		const response: ApiErrorResponse = {
			success: false,
			error: typedError.message || 'Failed to create volume',
			code: typedError.code || ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: typedError.details || typedError
		};
		const status = typeof typedError.statusCode === 'number' ? typedError.statusCode : 500;
		return json(response, { status });
	}

	const volumeInfo: VolumeInspectInfo = volumeResult.data;
	return json(
		{
			success: true,
			volume: volumeInfo
		},
		{ status: 201 }
	);
};
