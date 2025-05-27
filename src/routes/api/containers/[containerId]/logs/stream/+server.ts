import { error } from '@sveltejs/kit';
import { getDockerClient } from '$lib/services/docker/core';
import { Writable } from 'stream';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const { containerId } = params;

	if (!containerId) {
		throw error(400, 'Container ID is required');
	}

	try {
		const docker = await getDockerClient();
		const container = docker.getContainer(containerId);
		await container.inspect();

		const stream = new ReadableStream({
			start(controller) {
				const encoder = new TextEncoder();
				let isClosed = false;
				let logStream: NodeJS.ReadableStream | null = null;

				const safeEnqueue = (data: string) => {
					if (!isClosed) {
						try {
							controller.enqueue(encoder.encode(data));
						} catch (err) {
							isClosed = true;
						}
					}
				};

				const stdoutStream = new Writable({
					write(chunk, encoding, callback) {
						if (isClosed) {
							callback();
							return;
						}

						const message = chunk.toString();
						const data = JSON.stringify({
							level: 'stdout',
							message: message,
							timestamp: new Date().toISOString()
						});

						safeEnqueue(`data: ${data}\n\n`);
						callback();
					}
				});

				const stderrStream = new Writable({
					write(chunk, encoding, callback) {
						if (isClosed) {
							callback();
							return;
						}

						const message = chunk.toString();
						const data = JSON.stringify({
							level: 'stderr',
							message: message,
							timestamp: new Date().toISOString()
						});

						safeEnqueue(`data: ${data}\n\n`);
						callback();
					}
				});

				const cleanup = () => {
					isClosed = true;
					if (logStream) {
						try {
							if (typeof (logStream as any).destroy === 'function') {
								(logStream as any).destroy();
							}
						} catch (err) {
							// Silent cleanup
						}
					}
				};

				container.logs(
					{
						follow: true,
						stdout: true,
						stderr: true,
						timestamps: true,
						tail: 50
					},
					(err, stream) => {
						if (err) {
							if (!isClosed) {
								controller.error(err);
							}
							return;
						}

						logStream = stream || null;

						if (stream && !isClosed) {
							container.modem.demuxStream(stream, stdoutStream, stderrStream);

							stream.on('end', () => {
								cleanup();
								if (!isClosed) {
									controller.close();
								}
							});

							stream.on('error', (streamErr) => {
								cleanup();
								if (!isClosed) {
									controller.error(streamErr);
								}
							});

							stream.on('close', () => {
								cleanup();
							});
						} else {
							cleanup();
						}
					}
				);

				request.signal.addEventListener('abort', () => {
					cleanup();
				});

				return cleanup;
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Cache-Control'
			}
		});
	} catch (err) {
		throw error(500, 'Failed to stream container logs');
	}
};
