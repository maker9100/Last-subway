import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  build: { target: 'es2022', chunkSizeWarningLimit: 700 },
  server: { host: '0.0.0.0', allowedHosts: true }
});
