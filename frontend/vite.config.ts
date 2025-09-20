import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	optimizeDeps: {
		exclude: ['@lucide/svelte']
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			cookieName: 'locale',
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		}),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'production',
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
			manifest: {
				short_name: 'Arcane',
				name: 'Arcane - Docker Container Management',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: '#000000',
				background_color: '#ffffff',
				icons: [
					{
						src: 'img/pwa/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'img/pwa/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: 'img/pwa/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
			},
			devOptions: {
				enabled: false,
				suppressWarnings: true,
				type: 'module',
				navigateFallback: '/',
			},
			kit: {
				trailingSlash: 'never'
			}
		})
	],
	server: {
		host: process.env.HOST,
		proxy: {
			'/api': {
				target: process.env.DEV_BACKEND_URL || 'http://localhost:3552',
				changeOrigin: true,
				ws: true
			}
		}
	}
});
