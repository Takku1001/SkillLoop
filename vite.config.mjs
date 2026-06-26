import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The new Svelte frontend lives in web/. It talks to the existing Express API
// (unchanged) on port 3000 via a dev proxy. Backend files are never touched.
export default defineConfig({
  root: 'web',
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
