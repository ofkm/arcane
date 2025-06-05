import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		exclude: ['ssh2', 'cpu-features'] // Exclude problematic dependencies
	},
	ssr: {
		noExternal: ['ssh2', 'cpu-features'] // Exclude from SSR bundling
	},
	build: {
		rollupOptions: {
			external: [/\.node$/] // Explicitly mark .node files as external
		}
	}
});
