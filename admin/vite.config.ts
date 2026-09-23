import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
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
