import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import packageJson from './package.json' with { type: 'json' };

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: '../backend/frontend/dist',
			fallback: 'index.html'
		}),
		paths: {
			base: process.env.NODE_ENV === 'production' ? '' : ''
		},
		csrf: {
			checkOrigin: process.env.NODE_ENV === 'production'
		},
		version: {
			name: packageJson.version
		}
	}
};

export default config;
