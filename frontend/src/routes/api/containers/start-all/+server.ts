import { json } from '@sveltejs/kit';
import { listContainers, startContainer } from '$lib/services/docker/container-service';
import type { RequestHandler } from './$types';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';
import type { ContainerInfo } from 'dockerode';

export const POST: RequestHandler = async () => {
	const result = await tryCatch(
		(async () => {
			const containers: ContainerInfo[] = await listContainers(true);
			const stopped = containers.filter((c) => c.State === 'exited');
			if (stopped.length === 0) {
				return { count: 0, message: 'No stopped containers to start.' };
			}
			await Promise.all(stopped.map((c) => startContainer(c.Id)));
			return { count: stopped.length, message: `Successfully started ${stopped.length} container(s).` };
		})()
	);

	if (result.error) {
		console.error('API Error (startAllStopped):', result.error);

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
		count: result.data.count,
		message: result.data.message
	});
};
