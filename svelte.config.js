import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

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
  },
};

export default config;
