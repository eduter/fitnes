import { resolve } from 'node:path';
import { build } from 'vite';
import solid from 'vite-plugin-solid';

/** Build only the reusable-controls demo, without the app's router, database or service worker. */
async function main(): Promise<void> {
    await build({
        configFile: false,
        root: resolve('src/components/Controls'),
        plugins: [solid()],
        build: { outDir: resolve('work/controls-preview'), emptyOutDir: true },
    });
}

await main();
