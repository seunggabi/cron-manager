import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: '../src/main/index.ts',
        vite: {
          build: {
            outDir: '../dist-electron/main',
            rollupOptions: {
              external: ['electron', /^@cron-manager\/shared/],
            },
          },
        },
      },
      {
        // Preload scripts
        entry: '../src/preload/index.ts',
        onstart(options) {
          // Notify the Renderer process to reload
          options.reload();
        },
        vite: {
          build: {
            outDir: '../dist-electron/preload',
            rollupOptions: {
              external: ['electron', /^@cron-manager\/shared/],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  root: 'frontend',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@cron-manager/shared': resolve(__dirname, './shared/dist'),
    },
  },
  server: {
    port: 5173,
  },
});
