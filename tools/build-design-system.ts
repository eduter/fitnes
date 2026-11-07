import { resolve } from 'node:path';
import { build } from 'vite';
import solid from 'vite-plugin-solid';

/** Build the isolated design-system showcase without app storage or service workers. */
async function main(): Promise<void> {
    await build({
        configFile: false,
        root: resolve('src/design-system'),
        plugins: [solid()],
        build: { outDir: resolve('work/design-system-preview'), emptyOutDir: true },
    });
}

await main();
