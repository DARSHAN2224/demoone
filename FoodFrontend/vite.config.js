import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // This proxy is essential for the dev environment
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8000', // Your backend URL
        ws: true, // Enable WebSocket proxying
      },
    },
  },
});
