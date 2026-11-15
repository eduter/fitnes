import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 30_000,
    use: {
        baseURL: 'http://127.0.0.1:4175',
        viewport: { width: 390, height: 844 },
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        timeout: 60_000,
        reuseExistingServer: false,
        env: { VITE_DROPBOX_APP_KEY: 'browser-test', VITE_PREVIEW_DATA: 'false', VITE_SYNC_DEMO: 'false' },
    },
});
