import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const rawBase = (env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || '/').trim() || '/';
  const basePath = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const disableHmr = (env.DISABLE_HMR || process.env.DISABLE_HMR) === 'true';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'assets/aistudio/1794978557793_3b5d5cb0.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: basePath,
          name: 'Đạo Ký — Tạo & Quản lý Blog GitHub Pages',
          short_name: 'Đạo Ký',
          description:
            'Đạo Ký — Ứng dụng viết bài Markdown, tải ảnh và quản lý blog GitHub Pages.',
          theme_color: '#111111',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: basePath,
          scope: basePath,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      hmr: !disableHmr,
      watch: disableHmr ? null : {},
    },
  };
});
