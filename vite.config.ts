import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: mode === 'development' ? '/' : "/assets/learnacademy_ess/ess/",
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://learnschool.online',
            changeOrigin: true,
            secure: true,
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.removeHeader('Expect');
                proxyReq.removeHeader('expect');
              });
            },
          },
          // Google Classroom integration backend (server/index.js)
          '/gc-api': {
            target: env.VITE_CLASSROOM_SERVER_URL || 'http://localhost:4100',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/gc-api/, '/api/classroom'),
          },
          '/gc-auth': {
            target: env.VITE_CLASSROOM_SERVER_URL || 'http://localhost:4100',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/gc-auth/, '/auth'),
          },
        },
      },

      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});