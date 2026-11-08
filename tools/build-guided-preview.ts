import { resolve } from 'node:path';
import { build } from 'vite';
import solid from 'vite-plugin-solid';

/** Build the isolated guided-workout prototype without database access or service workers. */
async function main(): Promise<void> {
    await build({
        configFile: false,
        base: './',
        root: resolve('src/guided-preview'),
        plugins: [solid()],
        build: { outDir: resolve(process.argv[2] ?? 'work/guided-preview/dist'), emptyOutDir: true },
    });
}

await main();
