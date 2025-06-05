import { getDockerClient } from '$lib/services/docker/core';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async ({ params, request }) => {
	const { containerId } = params;
	const docker = await getDockerClient();

	const result = await tryCatch(
		(async () => {
			const container = docker.getContainer(containerId);
			const encoder = new TextEncoder();

			const stream = new ReadableStream({
				start(controller) {
					let isActive = true;
					const pollInterval: ReturnType<typeof setInterval> = setInterval(async () => {
						if (!isActive) return;

						try {
							const stats = await container.stats({ stream: false });
							if (!isActive) return;
							try {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
							} catch (err) {
								if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_INVALID_STATE') {
									cleanup();
								} else {
									console.error('Enqueue error:', err);
								}
							}
						} catch (err) {
							if (!isActive) return;

							if ((err as { statusCode?: number }).statusCode === 404) {
								try {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({ removed: true })}\n\n`));
									cleanup();
									controller.close();
								} catch {
									cleanup();
								}
							} else {
								console.error('Container stats error:', err);
							}
						}
					}, 2000);

					const pingInterval: ReturnType<typeof setInterval> = setInterval(() => {
						if (!isActive) return;
						try {
							controller.enqueue(encoder.encode(':\n\n'));
						} catch (err) {
							if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ERR_INVALID_STATE') {
								cleanup();
							}
						}
					}, 15000);

					const cleanup = () => {
						isActive = false;
						clearInterval(pollInterval);
						clearInterval(pingInterval);
					};

					request.signal.addEventListener('abort', cleanup);

					return cleanup;
				},
				cancel() {
					// Cleanup handled by return function from start()
				}
			});

			return stream;
		})()
	);

	if (result.error) {
		console.error('Error streaming container stats:', result.error);

		const response: ApiErrorResponse = {
			success: false,
			error: extractDockerErrorMessage(result.error),
			code: ApiErrorCode.DOCKER_API_ERROR,
			details: result.error
		};

		return json(response, { status: 500 });
	}

	return new Response(result.data, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
