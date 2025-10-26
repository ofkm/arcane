import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import packageJson from './package.json' with { type: 'json' };

const basePath = process.env.BASE_PATH || '';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: process.env.BUILD_PATH ?? '../backend/frontend/dist',
			fallback: 'index.html'
		}),
		paths: {
			base: basePath
		},
		version: {
			name: packageJson.version
		}
	}
};

export default config;
