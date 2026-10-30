import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';
import { capturePage } from './capture.ts';
import { checkPicture } from './check.ts';
import { decodePng } from './png.ts';
import { nativePixels } from './scale.ts';

/** Run the agent check; stdout is JSON and only a proven pass exits zero. */
async function main(): Promise<void> {
    try {
        const { values, positionals } = parseArgs({
            allowPositionals: true,
            options: {
                url: { type: 'string' },
                ready: { type: 'string' },
                out: { type: 'string', default: 'work/nes-check' },
                scale: { type: 'string', default: '1' },
                help: { type: 'boolean' },
            },
        });
        if (values.help) {
            console.log(
                'Usage: npm run nes:check -- image.png [more.png] [--scale N] [--out DIR]\n       npm run nes:check -- --url http://localhost:5173/ [--ready SELECTOR] [--out DIR]\nExit: 0 pass, 1 violation, 2 inconclusive, 3 input/capture error'
            );
            return;
        }
        if (Boolean(values.url) === positionals.length > 0) {
            throw new Error('Provide PNG paths or one --url');
        }
        if (values.url && values.scale !== '1') {
            throw new Error('--url captures at native scale; --scale applies only to PNG input');
        }
        if (!values.url && values.ready) {
            throw new Error('--ready applies only to --url');
        }
        mkdirSync(values.out, { recursive: true });
        const reports = [];
        for (const [index, input] of (values.url ? [values.url] : positionals).entries()) {
            const bytes = values.url ? await capturePage(input, values.ready) : readFileSync(input);
            const name = `${index + 1}-${values.url ? 'page' : basename(input, '.png')}`;
            const screenshot = join(values.out, `${name}.png`);
            writeFileSync(screenshot, bytes);
            const report = { input, screenshot, ...checkPicture(nativePixels(decodePng(bytes), Number(values.scale))) };
            writeFileSync(join(values.out, `${name}.json`), `${JSON.stringify(report, null, 2)}\n`);
            reports.push(report);
        }
        console.log(JSON.stringify(reports, null, 2));
        process.exitCode = reports.some((report) => report.status === 'fail')
            ? 1
            : reports.some((report) => report.status === 'inconclusive')
              ? 2
              : 0;
    } catch (error) {
        console.error(
            JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : String(error) })
        );
        process.exitCode = 3;
    }
}

await main();
