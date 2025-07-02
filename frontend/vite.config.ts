import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: process.env.HOST,
		proxy: {
			'/api': {
				target: process.env.DEV_BACKEND_URL || 'http://localhost:8080'
			}
		}
	}
});
