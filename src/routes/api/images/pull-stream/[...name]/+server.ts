import type { RequestHandler } from './$types';
import { getDockerClient } from '$lib/services/docker/core';
import { URL } from 'url';

export const GET: RequestHandler = async ({ params, request }) => {
	const imageName = params.name;
	const url = new URL(request.url);
	const tag = url.searchParams.get('tag') || 'latest';
	const platform = url.searchParams.get('platform');

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive'
	});

	const stream = new ReadableStream({
		async start(controller) {
			try {
				const docker = getDockerClient();

				function send(data: any) {
					controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
				}

				const fullImageRef = `${imageName}:${tag}`;

				// Construct pull options
				const pullOptions: { platform?: string } = {};
				if (platform) {
					pullOptions.platform = platform;
				}

				// Pass options to docker.pull
				const pullStream = await docker.pull(fullImageRef, pullOptions);

				type LayerProgress = {
					current: number;
					total: number;
				};
				const layers: Record<string, LayerProgress> = {};
				let totalProgress = 0;

				docker.modem.followProgress(
					pullStream,
					(err: Error | null, output: any[]) => {
						// Pull complete
						if (err) {
							send({ error: err.message });
						} else {
							send({ complete: true, progress: 100 });
						}
						controller.close();
					},
					(event: any) => {
						if (event.id && event.status) {
							if (!layers[event.id]) {
								layers[event.id] = { current: 0, total: 0 };
							}

							if (event.progressDetail && event.progressDetail.current && event.progressDetail.total) {
								layers[event.id].current = event.progressDetail.current;
								layers[event.id].total = event.progressDetail.total;
							}

							let totalSize = 0;
							let currentProgress = 0;

							Object.values(layers).forEach((layer: any) => {
								if (layer.total > 0) {
									totalSize += layer.total;
									currentProgress += layer.current;
								}
							});

							if (totalSize > 0) {
								totalProgress = Math.min(99, Math.floor((currentProgress / totalSize) * 100));
								send({ progress: totalProgress, status: event.status });
							} else {
								// Send initial status even if progress can't be calculated yet
								send({ progress: 0, status: event.status });
							}
						} else if (event.status) {
							// Send status updates that don't have layer progress
							send({ status: event.status });
						}
					}
				);
			} catch (error: any) {
				controller.enqueue(
					new TextEncoder().encode(
						`data: ${JSON.stringify({
							error: error.message || 'Unknown error pulling image'
						})}\n\n`
					)
				);
				controller.close();
			}
		}
	});

	return new Response(stream, { headers });
};
