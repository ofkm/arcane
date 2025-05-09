import { json } from '@sveltejs/kit';
import { listContainers, stopContainer } from '$lib/services/docker/container-service';
import type { RequestHandler } from './$types';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const POST: RequestHandler = async () => {
	const result = await tryCatch(
		(async () => {
			const containers = await listContainers(true);
			const running = containers.filter((c) => c.state === 'running');
			if (running.length === 0) {
				return { count: 0, message: 'No running containers to stop.' };
			}
			await Promise.all(running.map((c) => stopContainer(c.id)));
			console.log(`API: Stopped ${running.length} containers.`);
			return { count: running.length, message: `Successfully stopped ${running.length} container(s).` };
		})()
	);

	if (result.error) {
		console.error('API Error (stopAllRunning):', result.error);

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
