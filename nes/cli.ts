import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compileScreenFile } from './compile.ts';
import { type Diagnostic, formatDiagnostic } from './diagnostics.ts';
import { masterPalette } from './palette.ts';
import { encodePng, scaleNearest } from './png.ts';
import { renderScreen } from './render.ts';

/**
 * `validate <screen>` prints diagnostics and exits 1 when the screen breaks
 * a constraint. `render <screen> --out <png>` writes a PNG only for a valid
 * screen; `--scale` is an integer nearest-neighbor preview of that PNG.
 */
function main(argv: readonly string[]): number {
    const [command, ...rest] = argv;

    if (command === 'validate') {
        return validate(rest);
    }
    if (command === 'render') {
        return render(rest);
    }

    console.error('usage: nes:validate <screen.json>');
    console.error('       nes:render <screen.json> --out <file.png> [--scale <integer>] [--preview <file.png>]');
    return 1;
}

function validate(args: readonly string[]): number {
    const file = args[0];
    if (file === undefined || file.startsWith('--')) {
        console.error('usage: nes:validate <screen.json>');
        return 1;
    }

    const result = compileScreenFile(file);
    return report(file, result.diagnostics, result.valid);
}

function render(args: readonly string[]): number {
    const parsed = parseRenderArgs(args);
    if (parsed === undefined) {
        console.error('usage: nes:render <screen.json> --out <file.png> [--scale <integer>] [--preview <file.png>]');
        return 1;
    }

    const result = compileScreenFile(parsed.file);
    if (report(parsed.file, result.diagnostics, result.valid) !== 0 || result.screen === undefined) {
        return 1;
    }

    const native = renderScreen(result.screen, masterPalette());
    writePng(parsed.out, scaleNearest(native, parsed.scale));
    console.log(`wrote ${parsed.out} (${native.width * parsed.scale}×${native.height * parsed.scale})`);

    if (parsed.preview !== undefined) {
        writePng(parsed.preview, scaleNearest(native, result.screen.scale));
        console.log(
            `wrote ${parsed.preview} (${native.width * result.screen.scale}×${native.height * result.screen.scale})`
        );
    }
    return 0;
}

function report(file: string, diagnostics: readonly Diagnostic[], valid: boolean): number {
    for (const diagnostic of diagnostics) {
        console.error(formatDiagnostic(diagnostic));
    }

    if (!valid) {
        const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
        console.error(`${file}: invalid (${errors} ${errors === 1 ? 'error' : 'errors'})`);
        return 1;
    }

    console.log(`${file}: valid`);
    return 0;
}

function parseRenderArgs(
    args: readonly string[]
): { file: string; out: string; scale: number; preview?: string } | undefined {
    const file = args[0];
    if (file === undefined || file.startsWith('--')) {
        return undefined;
    }

    let out: string | undefined;
    let preview: string | undefined;
    let scale = 1;

    for (let index = 1; index < args.length; index++) {
        const flag = args[index];
        const value = args[index + 1];
        if (flag === '--out' && value !== undefined) {
            out = value;
            index += 1;
            continue;
        }
        if (flag === '--preview' && value !== undefined) {
            preview = value;
            index += 1;
            continue;
        }
        if (flag === '--scale' && value !== undefined && /^[1-9]\d*$/.test(value)) {
            scale = Number(value);
            index += 1;
            continue;
        }
        return undefined;
    }

    if (out === undefined) {
        return undefined;
    }
    return { file, out, scale, preview };
}

function writePng(path: string, image: Parameters<typeof encodePng>[0]): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, encodePng(image));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
    process.exit(main(process.argv.slice(2)));
}

export { main };
