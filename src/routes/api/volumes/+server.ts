import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createVolume } from '$lib/services/docker/volume-service';
import type { VolumeCreateOptions } from 'dockerode';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { tryCatch } from '$lib/utils/try-catch';

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
			error: 'Volume name is required.',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const volumeResult = await tryCatch(createVolume(body));
	if (volumeResult.error) {
		console.error('API Error creating volume:', volumeResult.error);
		const response: ApiErrorResponse = {
			success: false,
			error: volumeResult.error.message || 'Failed to create volume',
			code: ApiErrorCode.INTERNAL_SERVER_ERROR,
			details: volumeResult.error
		};
		return json(response, { status: 500 });
	}

	const volumeInfo = volumeResult.data;
	return json(
		{
			success: true,
			volume: {
				...volumeInfo,
				Name: volumeInfo.name
			}
		},
		{ status: 201 }
	);
};
