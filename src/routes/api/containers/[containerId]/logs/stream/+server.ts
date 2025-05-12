import { getDockerClient } from '$lib/services/docker/core';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { tryCatch } from '$lib/utils/try-catch';

export const GET: RequestHandler = async ({ params }) => {
	const { containerId } = params;
	const docker = await getDockerClient();

	const result = await tryCatch(
		(async () => {
			const container = docker.getContainer(containerId);

			// Check if container exists
			const containerInfo = await container.inspect();
			const hasTty = containerInfo.Config.Tty === true;

			// Create a stream for Server-Sent Events (SSE)
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				async start(controller) {
					try {
						const logStream = await container.logs({
							follow: true,
							stdout: true,
							stderr: true,
							timestamps: false,
							tail: 300
						});

						logStream.on('data', (chunk) => {
							let log;
							if (!hasTty) {
								log = chunk.slice(8).toString('utf8');
							} else {
								log = chunk.toString('utf8');
							}
							controller.enqueue(encoder.encode(`data: ${log}\n\n`));
						});

						logStream.on('end', () => {
							controller.close();
						});

						logStream.on('error', (err) => {
							console.error('Log stream error:', err);
							controller.error(err);
						});
					} catch (err) {
						console.error('Error setting up log stream:', err);
						controller.error(err);
					}
				}
			});

			return stream;
		})()
	);

	if (result.error) {
		console.error('Error streaming container logs:', result.error);

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
