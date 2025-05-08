import { getDockerClient } from '$lib/services/docker/core';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;
	const docker = getDockerClient();

	try {
		const container = docker.getContainer(id);

		// Check if container exists
		const containerInfo = await container.inspect();
		const hasTty = containerInfo.Config.Tty === true;

		// Create a stream for Server-Sent Events (SSE)
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Get log stream from Docker
					const logStream = await container.logs({
						follow: true, // Follow logs (stream)
						stdout: true, // Get stdout stream
						stderr: true, // Get stderr stream
						timestamps: false, // Don't include timestamps (we'll format in frontend)
						tail: 300 // Start with most recent logs
					});

					// Handle data chunks
					logStream.on('data', (chunk) => {
						let log;
						// Remove Docker header (first 8 bytes)
						if (!hasTty) {
							// Remove Docker header (first 8 bytes)
							log = chunk.slice(8).toString('utf8');
						} else {
							// For TTY-enabled containers, use the chunk as-is
							log = chunk.toString('utf8');
						}

						// Format as SSE message
						controller.enqueue(encoder.encode(`data: ${log}\n\n`));
					});

					// Handle end of stream
					logStream.on('end', () => {
						controller.close();
					});

					// Handle errors
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

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (err) {
		console.error('Error streaming container logs:', err);
		throw error(500, 'Failed to stream container logs');
	}
};
