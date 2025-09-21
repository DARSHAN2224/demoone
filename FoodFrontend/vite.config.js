import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fix React refresh issues
      fastRefresh: true,
      // Ensure proper JSX handling
      jsxRuntime: 'automatic'
    })
  ],
  define: {
    // Define process.env for client-side usage
    'process.env': process.env,
    // Define global variables
    global: 'globalThis',
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    // HMR configuration - Fix WebSocket connection issues
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
  resolve: {
    alias: {
      // Ensure single React instance and prevent duplicates
      'react': 'react',
      'react-dom': 'react-dom',
      // Add @ alias for src directory - fixes all module resolution errors
      '@': path.resolve(__dirname, './src'),
    }
  },
})
