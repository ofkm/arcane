import { getDockerClient } from '$lib/services/docker/core';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const { id } = params;
	const docker = getDockerClient();

	try {
		const container = docker.getContainer(id);
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start(controller) {
				// Track if the controller is still active
				let isActive = true;
				let pollInterval: ReturnType<typeof setInterval>;
				let pingInterval: ReturnType<typeof setInterval>;

				// Clean up function to handle all interval clearing
				const cleanup = () => {
					isActive = false;
					clearInterval(pollInterval);
					clearInterval(pingInterval);
				};

				// Listen for client disconnects
				request.signal.addEventListener('abort', cleanup);

				// Poll container stats
				pollInterval = setInterval(async () => {
					if (!isActive) return;

					try {
						// Get container stats
						const stats = await container.stats({ stream: false });

						// Check if still active before sending
						if (!isActive) return;

						try {
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
						} catch (err) {
							// Controller is closed
							if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'ERR_INVALID_STATE') {
								cleanup();
							} else {
								console.error('Enqueue error:', err);
							}
						}
					} catch (err) {
						if (!isActive) return;

						if ((err as any).statusCode === 404) {
							try {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({ removed: true })}\n\n`));
								cleanup();
								controller.close();
							} catch (e) {
								// Ignore errors if controller is already closed
								cleanup();
							}
						} else {
							console.error('Container stats error:', err);
						}
					}
				}, 2000);

				// Keep-alive ping
				pingInterval = setInterval(() => {
					if (!isActive) return;

					try {
						controller.enqueue(encoder.encode(':\n\n'));
					} catch (err) {
						if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'ERR_INVALID_STATE') {
							cleanup();
						}
					}
				}, 15000);

				// Return cleanup function
				return cleanup;
			},

			cancel() {
				// This is called when the client disconnects
				// Cleanup is handled by the return function from start()
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (err) {
		console.error('Error streaming container stats:', err);
		throw error(500, 'Failed to stream container stats');
	}
};
