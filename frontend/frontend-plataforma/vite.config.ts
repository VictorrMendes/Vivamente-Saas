import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { mockApiServer } from './dev/mockApiServer';

export default defineConfig(({ command }) => ({
  plugins: [vue(), command === 'serve' && mockApiServer()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
  },
}));
