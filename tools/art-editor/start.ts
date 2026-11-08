import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'vite';
import { createEditorServer } from './server.ts';

/** Build and start the WSL/Linux editor, bound only to local loopback. */
async function main(): Promise<void> {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const { values } = parseArgs({ options: { port: { type: 'string', default: '4180' }, core: { type: 'string' } } });
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        throw new Error('Choose a port between 1024 and 65535');
    }
    await build({
        configFile: false,
        root: resolve(root, 'tools/art-editor/client'),
        build: { outDir: resolve(root, 'work/art-editor-ui'), emptyOutDir: true },
    });
    const core = values.core ? resolve(values.core) : resolve(root, 'work/nes-emulator-core/fceumm_libretro.so');
    const server = createEditorServer(root, core);
    server.listen(port, '127.0.0.1', () => {
        console.log(
            `\nFitNES artwork editor: http://localhost:${port}\nOpen this URL in your Windows browser. Keep this Ubuntu terminal running.\nDraft: work/art-editor/draft.json · Ctrl+C stops the editor.\n`
        );
    });
    server.on('error', (error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

await main();
