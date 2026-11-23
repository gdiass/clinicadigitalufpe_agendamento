import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', 
  plugins: [
    tailwindcss(),
    react(),
    federation({
      name: 'categoriesMfe',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        'react/jsx-runtime': { singleton: true, requiredVersion: false },
        'react/jsx-dev-runtime': { singleton: true, requiredVersion: false },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    cors: true,
    proxy: {
      '/api/v1/schedules': {
        target: process.env.API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/v1/schedules', '/api/v1'),
      },
      // Catch-all: rotas da API do módulo (ex.: /api/v1/perfil/me) que chegam
      // reescritas pelo shell e não casam com o proxy /api/v1/schedules.
      '/api/v1': {
        target: process.env.API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
