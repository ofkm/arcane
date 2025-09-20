<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	onMount(async () => {
		if (!browser) return;

		// Check if PWA is supported
		if (!('serviceWorker' in navigator)) return;

		try {
			// Dynamic import to avoid bundling issues
			const { Workbox } = await import('workbox-window');

			// Create a new Workbox instance with a service worker file
			const wb = new Workbox('/service-worker.js', { scope: '/' });

			// Silent service worker registration - no UI prompts
			wb.addEventListener('controlling', () => {
				// Auto-reload when new service worker takes control
				window.location.reload();
			});

			// Register the service worker silently
			await wb.register();
			
			// Check for updates periodically (every 10 minutes)
			setInterval(() => {
				wb.update();
			}, 600000);
		} catch (error) {
			// Silently handle errors - PWA is optional functionality
			console.warn('PWA service worker registration failed:', error);
		}
	});
</script>
