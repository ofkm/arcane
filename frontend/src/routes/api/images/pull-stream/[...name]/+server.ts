import type { RequestHandler } from './$types';
import { getDockerClient } from '$lib/services/docker/core';
import { URL } from 'url';
import { ApiErrorCode, type ApiErrorResponse } from '$lib/types/errors.type';
import { extractDockerErrorMessage } from '$lib/utils/errors.util';
import { json } from '@sveltejs/kit';
import { getSettings } from '$lib/services/settings-service';
import { areRegistriesEquivalent } from '$lib/utils/registry.utils';

interface AuthConfig {
	username: string;
	password?: string;
	serveraddress: string;
}

export const GET: RequestHandler = async ({ params, request }) => {
	const imageName = params.name;

	if (!imageName) {
		const response: ApiErrorResponse = {
			success: false,
			error: 'Image name is required',
			code: ApiErrorCode.BAD_REQUEST
		};
		return json(response, { status: 400 });
	}

	const reqUrl = new URL(request.url);
	const tag = reqUrl.searchParams.get('tag') || 'latest';
	const platform = reqUrl.searchParams.get('platform');

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive'
	});

	const stream = new ReadableStream({
		async start(controller) {
			try {
				const docker = await getDockerClient();
				const settings = await getSettings();

				function send(data: unknown) {
					controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
				}

				const fullImageRef = `${imageName}:${tag}`;
				const pullOptions: { platform?: string; authconfig?: AuthConfig } = {};

				if (platform) {
					pullOptions.platform = platform;
				}

				// Extract registry host from image name
				const imageRegistryHost = imageName.includes('/') ? (imageName.split('/')[0].includes('.') || imageName.split('/')[0].includes(':') ? imageName.split('/')[0] : 'docker.io') : 'docker.io';

				// Check for credentials in settings
				if (settings.registryCredentials && settings.registryCredentials.length > 0) {
					const storedCredential = settings.registryCredentials.find((cred) => areRegistriesEquivalent(cred.url, imageRegistryHost));

					if (storedCredential) {
						// Docker Hub's canonical serveraddress for authconfig
						const serverAddress = imageRegistryHost === 'docker.io' ? 'https://index.docker.io/v1/' : imageRegistryHost;

						pullOptions.authconfig = {
							username: storedCredential.username,
							password: storedCredential.password,
							serveraddress: serverAddress
						};
						send({
							type: 'info',
							message: `Using stored credentials for ${imageRegistryHost} as ${storedCredential.username}`
						});
					} else if (imageRegistryHost !== 'docker.io') {
						// Only warn about missing credentials for non-Docker Hub registries
						send({
							type: 'warning',
							message: `No stored credentials found for ${imageRegistryHost}. Attempting unauthenticated pull.`
						});
					}
				}

				const pullStream = await docker.pull(fullImageRef, pullOptions);

				type LayerProgress = {
					current: number;
					total: number;
				};
				const layers: Record<string, LayerProgress> = {};

				docker.modem.followProgress(
					pullStream,
					(err: Error | null) => {
						if (err) {
							const errorResponse: ApiErrorResponse = {
								success: false,
								error: extractDockerErrorMessage(err),
								code: ApiErrorCode.DOCKER_API_ERROR,
								details: err
							};
							send(errorResponse);
						} else {
							send({
								success: true,
								complete: true,
								progress: 100,
								status: 'Download complete'
							});
						}
						controller.close();
					},
					(event: Record<string, unknown>) => {
						if (event.id && event.status) {
							if (!layers[event.id as string]) {
								layers[event.id as string] = { current: 0, total: 0 };
							}

							if (event.progressDetail && (event.progressDetail as Record<string, number>).current && (event.progressDetail as Record<string, number>).total) {
								layers[event.id as string].current = (event.progressDetail as Record<string, number>).current;
								layers[event.id as string].total = (event.progressDetail as Record<string, number>).total;
							}

							let totalSize = 0;
							let currentProgressSum = 0;
							let calculatedProgress = 0;

							Object.values(layers).forEach((layer: LayerProgress) => {
								if (layer.total > 0) {
									totalSize += layer.total;
									currentProgressSum += layer.current;
								}
							});

							if (totalSize > 0) {
								calculatedProgress = Math.min(99, Math.floor((currentProgressSum / totalSize) * 100));
								send({
									success: true,
									progress: calculatedProgress,
									status: event.status,
									id: event.id
								});
							} else if (event.status) {
								send({
									success: true,
									progress: 0,
									status: event.status,
									id: event.id
								});
							}
						} else if (event.status) {
							const lastLayerKey = Object.keys(layers).pop();
							const lastKnownProgress = lastLayerKey && layers[lastLayerKey]?.total > 0 ? Math.min(99, Math.floor((layers[lastLayerKey].current / layers[lastLayerKey].total) * 100)) : 0;
							send({
								success: true,
								status: event.status,
								progress: lastKnownProgress
							});
						}
					}
				);
			} catch (error: unknown) {
				const errorResponse: ApiErrorResponse = {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error pulling image',
					code: ApiErrorCode.DOCKER_API_ERROR,
					details: error
				};
				controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
				controller.close();
			}
		}
	});

	return new Response(stream, { headers });
};
