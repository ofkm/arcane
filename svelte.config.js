import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import packageJson from './package.json' with { type: "json" };

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      out: "build",
      precompress: false,
      polyfill: true,
    }),
    csrf: {
      checkOrigin: process.env.NODE_ENV === "production",
    },
    version: {
			name: packageJson.version
		}
  },
};

export default config;
