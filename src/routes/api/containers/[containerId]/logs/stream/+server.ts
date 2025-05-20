import { getDockerClient } from '$lib/services/docker/core';
import type { RequestHandler } from '@sveltejs/kit';
import type { Readable } from 'stream';

// Define a custom interface for our stream source
interface LogStreamSource extends UnderlyingDefaultSource<Uint8Array> {
	logStream?: Readable;
}

export const GET: RequestHandler = async ({ params }) => {
	if (!params.containerId) {
		return new Response('Container ID is required', { status: 400 });
	}

	const docker = await getDockerClient();
	const container = docker.getContainer(params.containerId);

	// Create a ReadableStream with our custom source type
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				// Get logs stream from Docker
				const logStream = (await container.logs({
					follow: true,
					stdout: true,
					stderr: true,
					timestamps: true
				})) as Readable;

				// Track controller state
				let isControllerClosed = false;

				// Set up cleanup for client disconnection
				const cleanup = () => {
					isControllerClosed = true;
					if (logStream && logStream.destroy) {
						logStream.destroy();
					}
				};

				// Handle Docker stream events
				logStream.on('data', (chunk) => {
					try {
						// Only enqueue if controller is still open
						if (!isControllerClosed) {
							controller.enqueue(chunk);
						}
					} catch (error: any) {
						// Handle "controller closed" errors gracefully
						if (error.code === 'ERR_INVALID_STATE') {
							cleanup();
						} else {
							console.error('Error streaming logs:', error);
						}
					}
				});

				logStream.on('end', () => {
					if (!isControllerClosed) {
						controller.close();
						isControllerClosed = true;
					}
				});

				logStream.on('error', (err) => {
					console.error('Docker logs stream error:', err);
					if (!isControllerClosed) {
						controller.error(err);
						isControllerClosed = true;
					}
				});

				// Store for cleanup in cancel
				(this as LogStreamSource).logStream = logStream;
			} catch (error) {
				console.error('Error starting logs stream:', error);
				controller.error(error);
			}
		},

		cancel() {
			// Called when client disconnects
			console.log('Client disconnected from logs stream');
			const self = this as LogStreamSource;
			if (self.logStream && self.logStream.destroy) {
				self.logStream.destroy();
			}
		}
	} as LogStreamSource);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
