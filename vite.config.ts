import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves a project site under `/<repo>/`; the deploy workflow sets
// PAGES_BASE_PATH to that path. A bare `npm run build` stays at the domain root.
const rawBase = process.env.PAGES_BASE_PATH ?? '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

const pwa = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
    ],
    manifest: {
        id: base,
        name: 'FitNES',
        short_name: 'FitNES',
        description: 'Personal offline-first workout tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
            {
                src: 'pwa-64x64.png',
                sizes: '64x64',
                type: 'image/png',
            },
            {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: 'maskable-icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    },
    workbox: {
        // The isolated review page has its own HTML rather than the application's router shell.
        navigateFallbackDenylist: [new RegExp(`^${base}design-system(?:/|$)`)],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
    },
});

export default defineConfig(({ mode }) => ({
    base,
    plugins: [solid(), pwa],
    server: {
        host: true,
    },
    // jsdom component tests need Solid's browser build; keep this off prod/dev resolve.
    ...(mode === 'test'
        ? {
              resolve: {
                  conditions: ['development', 'browser'],
              },
          }
        : {}),
    test: {
        environment: 'node',
        maxWorkers: 2,
        setupFiles: ['src/test/setup.ts'],
    },
}));
