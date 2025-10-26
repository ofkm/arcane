import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

function getBasePath() {
	if (process.env.BASE_PATH) return process.env.BASE_PATH;
	try {
		const url = new URL(process.env.APP_URL || '');
		return url.pathname.replace(/\/$/, '') || '';
	} catch {
		return '';
	}
}

const basePath = getBasePath();

export default defineConfig({
	base: basePath,
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
		})
	],
	server: {
		host: process.env.HOST,
		proxy: {
			[`${basePath}/api`]: {
				target: process.env.DEV_BACKEND_URL || 'http://localhost:3552',
				changeOrigin: true,
				ws: true
			}
		}
	}
});
