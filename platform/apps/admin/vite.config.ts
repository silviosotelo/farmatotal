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
    // Orden: específicos ANTES de '@' (el primero que matchea gana).
    // @platform/ui extraído a packages/ui; los @/components/ui|shared, @/utils y los
    // archivos de theme/store/configs/locales movidos se redirigen al paquete.
    alias: [
      { find: '@platform/ui', replacement: path.join(__dirname, '../../packages/ui/src') },
      { find: '@platform/engine', replacement: path.join(__dirname, '../../packages/engine/src') },
      { find: '@/components/ui', replacement: path.join(__dirname, '../../packages/ui/src/ui') },
      { find: '@/components/shared', replacement: path.join(__dirname, '../../packages/ui/src/shared') },
      { find: '@/utils', replacement: path.join(__dirname, '../../packages/ui/src/utils') },
      { find: '@/@types/common', replacement: path.join(__dirname, '../../packages/ui/src/@types/common') },
      { find: '@/@types/theme', replacement: path.join(__dirname, '../../packages/ui/src/@types/theme') },
      { find: '@/@types/navigation', replacement: path.join(__dirname, '../../packages/ui/src/@types/navigation') },
      { find: '@/@types/routes', replacement: path.join(__dirname, '../../packages/ui/src/@types/routes') },
      { find: '@/store/themeStore', replacement: path.join(__dirname, '../../packages/ui/src/store/themeStore') },
      { find: '@/store/localeStore', replacement: path.join(__dirname, '../../packages/ui/src/store/localeStore') },
      { find: '@/configs/theme.config', replacement: path.join(__dirname, '../../packages/ui/src/configs/theme.config') },
      { find: '@/configs/preset-theme-schema.config', replacement: path.join(__dirname, '../../packages/ui/src/configs/preset-theme-schema.config') },
      { find: '@/configs/app.config', replacement: path.join(__dirname, '../../packages/ui/src/configs/app.config') },
      { find: '@/locales', replacement: path.join(__dirname, '../../packages/ui/src/locales') },
      { find: '@', replacement: path.join(__dirname, 'src') },
    ],
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
