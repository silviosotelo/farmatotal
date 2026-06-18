import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import dynamicImport from 'vite-plugin-dynamic-import'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dynamicImport()],
  assetsInclude: ['**/*.md'],
  optimizeDeps: {
    include: [
      '@chaibuilder/sdk',
      '@chaibuilder/sdk/web-blocks',
      '@chaibuilder/sdk/runtime',
    ],
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.trycloudflare.com', 'localhost'],
    proxy: {
      // Proxy a EverShop para datos reales (evita CORS)
      '/evershop': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/evershop/, '/api'),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.trycloudflare.com', 'localhost'],
  },
  build: {
    outDir: 'build'
  }
})
