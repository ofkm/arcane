/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

const DATA_CACHE = `data-cache-${version}`;
const CACHE = `cache-${version}`;

const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	console.log('[ServiceWorker] Install');

	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		console.log('[ServiceWorker] Caching app shell');
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	console.log('[ServiceWorker] Activate');

	async function deleteOldCaches() {
		const keyList = await caches.keys();
		await Promise.all(
			keyList.map((key) => {
				if (key !== CACHE && key !== DATA_CACHE) {
					console.log('[ServiceWorker] Removing old cache', key);
					return caches.delete(key);
				}
			})
		);
	}

	event.waitUntil(deleteOldCaches());
	return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	console.log('[ServiceWorker] Fetch', event.request.url);

	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	const isApiRequest = url.pathname.startsWith('/api/');

	async function respond() {
		if (isApiRequest) {
			const cache = await caches.open(DATA_CACHE);
			try {
				const response = await fetch(event.request);

				if (response.status === 200) {
					cache.put(event.request, response.clone());
				}

				return response;
			} catch (err) {
				const cachedResponse = await cache.match(event.request);
				if (cachedResponse) {
					return cachedResponse;
				}
				throw err;
			}
		} else {
			const cache = await caches.open(CACHE);
			const cachedResponse = await cache.match(event.request);

			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(event.request);
		}
	}

	event.respondWith(respond());
});
