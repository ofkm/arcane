import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createContainer } from '$lib/services/docker/container-service';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { listContainers } from '$lib/services/docker/container-service';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';
import type { ContainerInspectInfo } from 'dockerode';

export const POST: RequestHandler = async ({ request }) => {
	const config = (await request.json()) as ContainerInspectInfo;

	if (!config.Name || !config.Image) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Container name and image are required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	// Use name from either property
	const containerName = config.Name;
	const containerConfig = {
		...config,
		Name: containerName // Ensure Name is set correctly for downstream code
	};

	const result = await tryCatch(createContainer(containerConfig));

	if (result.error) {
		console.error('Error creating container:', result.error);

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
		container: result.data
	});
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const containers = await listContainers(true);

		return json(containers);
	} catch (error: any) {
		console.error('Failed to list containers:', error);
		return json({ error: 'Failed to list containers', details: error.message }, { status: 500 });
	}
};
