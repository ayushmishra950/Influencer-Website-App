import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Stamped into every asset filename so each build produces fresh URLs.
 *
 * Content hashes alone are not enough to recover from a bad cache entry: a rebuild of
 * unchanged source reproduces the same filename, so a browser holding a broken
 * response for that URL keeps serving it -- and these assets ship with
 * "max-age=31536000, immutable", so "keeps" means for a year. A build id guarantees
 * a deploy can always dig itself out, at the cost of re-downloading ~380 kB of admin
 * bundle per release.
 */
const buildId = Date.now().toString(36);

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${buildId}-[hash].js`,
        chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
        assetFileNames: `assets/[name]-${buildId}-[hash][extname]`,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // Keeps the browser on one origin in dev, so no CORS and no absolute URLs in code.
    proxy: {
      '/api': { target: 'http://localhost:5050', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5050', changeOrigin: true },
      // ws:true is required — without it the websocket upgrade fails and
      // Socket.IO silently degrades to slow polling.
      '/socket.io': { target: 'http://localhost:5050', changeOrigin: true, ws: true },
    },
  },
});
