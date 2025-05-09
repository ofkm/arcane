import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createNetwork } from '$lib/services/docker/network-service';
import type { NetworkCreateOptions } from 'dockerode';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async ({ request }) => {
	let options: NetworkCreateOptions;

	const requestBodyResult = await tryCatch(request.json());

	if (requestBodyResult.error) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Invalid JSON payload',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	options = requestBodyResult.data;

	if (!options.Name) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Network name (Name) is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	if (options.CheckDuplicate === undefined) {
		options.CheckDuplicate = true;
	}

	const result = await tryCatch(createNetwork(options));

	if (result.error) {
		console.error('API Error creating network:', result.error);

		if (result.error.message?.includes('already exists')) {
			const response: ApiErrorResponse = {
				success: false,
				error: `Network with name "${options.Name}" already exists`,
				code: ApiErrorCode.CONFLICT,
				details: result.error
			};
			return json(response, { status: 409 });
		}

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};
		return json(response, { status: 500 });
	}

	const networkInfo = result.data;

	return json({
		success: true,
		network: {
			id: networkInfo.Id,
			name: networkInfo.Name,
			driver: networkInfo.Driver,
			scope: networkInfo.Scope,
			subnet: networkInfo.IPAM?.Config?.[0]?.Subnet ?? null,
			gateway: networkInfo.IPAM?.Config?.[0]?.Gateway ?? null,
			created: networkInfo.Created
		},
		message: `Network "${networkInfo.Name}" created successfully.`
	});
};
