import { isRecord } from './assets.ts';
import { type AttributeGrid, parseAttributeGrid } from './attributes.ts';
import type { DiagnosticSink } from './diagnostics.ts';
import { SCREEN_HEIGHT, SCREEN_WIDTH, SUBPALETTE_COLORS, SUBPALETTE_COUNT } from './hardware.ts';
import { formatPaletteIndex, parsePaletteIndex } from './palette.ts';

/**
 * Palette RAM as a screen uses it. Every background subpalette's entry 0 is
 * the one `universal` color, so each subpalette lists only its three own
 * colors. Sprite subpalettes also list three: their entry 0 is transparent.
 */
interface ScreenPalettes {
    readonly universal: number;
    readonly background: readonly (readonly number[])[];
    readonly sprite: readonly (readonly number[])[] | undefined;
}

/** A screen document after its top-level fields are checked; layers are checked during layout. */
interface ScreenSource {
    readonly name: string;
    readonly assets: readonly string[];
    readonly palettes: ScreenPalettes;
    readonly attributes: AttributeGrid | undefined;
    readonly layers: readonly unknown[];
    readonly sprites: readonly unknown[];
    readonly spriteSize: '8x8';
    readonly scale: number;
}

const FIELDS = new Set([
    '$schema',
    'name',
    'width',
    'height',
    'assets',
    'palettes',
    'attributes',
    'layers',
    'sprites',
    'spriteSize',
    'preview',
]);
const DEFAULT_SCALE = 3;
const MAX_SCALE = 8;

/** Check a screen document's top level. Returns `undefined` when layout cannot proceed. */
function parseScreen(value: unknown, file: string, sink: DiagnosticSink): ScreenSource | undefined {
    if (!isRecord(value)) {
        sink.error('schema', file, '', 'screen must be a JSON object');
        return undefined;
    }

    for (const key of Object.keys(value)) {
        if (!FIELDS.has(key)) {
            sink.error('schema', file, key, `unknown field; expected one of ${[...FIELDS].join(', ')}`);
        }
    }

    // Identity and native size
    const name = value.name;
    if (typeof name !== 'string' || name === '') {
        sink.error('schema', file, 'name', 'screen needs a non-empty "name"');
    }
    checkDimension(value.width, { field: 'width', expected: SCREEN_WIDTH }, file, sink);
    checkDimension(value.height, { field: 'height', expected: SCREEN_HEIGHT }, file, sink);

    // Content
    const assets = stringArray(value.assets, 'assets', file, sink);
    const palettes = parsePalettes(value.palettes, file, sink);
    const attributes = value.attributes === undefined ? undefined : parseAttributeGrid(value.attributes, file, sink);
    const layers = optionalArray(value.layers, 'layers', file, sink);
    const sprites = optionalArray(value.sprites, 'sprites', file, sink);
    if (value.spriteSize !== undefined && value.spriteSize !== '8x8') {
        sink.error(
            'schema',
            file,
            'spriteSize',
            `sprite size '${String(value.spriteSize)}' is not supported; use "8x8"`
        );
    }
    if (sprites.length > 0 && palettes?.sprite === undefined) {
        sink.error('palette-shape', file, 'palettes.sprite', 'screen has sprites but no "sprite" palettes');
    }

    const scale = parseScale(value.preview, file, sink);

    if (typeof name !== 'string' || assets === undefined || palettes === undefined) {
        return undefined;
    }
    return { name, assets, palettes, attributes, layers, sprites, spriteSize: '8x8', scale };
}

function checkDimension(
    value: unknown,
    expected: { field: string; expected: number },
    file: string,
    sink: DiagnosticSink
): void {
    if (value !== expected.expected) {
        sink.error(
            'screen-dimensions',
            file,
            expected.field,
            `${expected.field} is ${JSON.stringify(value)}; NES output is exactly ${SCREEN_WIDTH}×${SCREEN_HEIGHT}`
        );
    }
}

function parsePalettes(value: unknown, file: string, sink: DiagnosticSink): ScreenPalettes | undefined {
    if (!isRecord(value)) {
        sink.error('palette-shape', file, 'palettes', 'screen needs "palettes" with "universal" and "background"');
        return undefined;
    }

    const universal = paletteIndex(value.universal, 'palettes.universal', file, sink);
    const background = subpalettes(value.background, 'palettes.background', file, sink);
    const sprite = value.sprite === undefined ? undefined : subpalettes(value.sprite, 'palettes.sprite', file, sink);

    if (universal === undefined || background === undefined) {
        return undefined;
    }
    return { universal, background, sprite };
}

function subpalettes(value: unknown, path: string, file: string, sink: DiagnosticSink): number[][] | undefined {
    if (!Array.isArray(value) || value.length !== SUBPALETTE_COUNT) {
        sink.error('palette-shape', file, path, `expected exactly ${SUBPALETTE_COUNT} subpalettes`);
        return undefined;
    }

    const parsed: number[][] = [];
    for (const [index, entry] of value.entries()) {
        const entryPath = `${path}[${index}]`;
        if (!Array.isArray(entry) || entry.length !== SUBPALETTE_COLORS) {
            const count = Array.isArray(entry) ? entry.length : 0;
            sink.error(
                'palette-shape',
                file,
                entryPath,
                `subpalette lists ${count} colors; list exactly ${SUBPALETTE_COLORS} (entry 0 is the shared universal color, or transparent for sprites)`
            );
            return undefined;
        }

        const colors = entry.map((color, slot) => paletteIndex(color, `${entryPath}[${slot}]`, file, sink));
        if (colors.some((color) => color === undefined)) {
            return undefined;
        }
        parsed.push(colors as number[]);
    }

    return parsed;
}

function paletteIndex(value: unknown, path: string, file: string, sink: DiagnosticSink): number | undefined {
    const index = parsePaletteIndex(value);

    if (index === undefined) {
        sink.error(
            'palette-index',
            file,
            path,
            `${JSON.stringify(value) ?? 'missing value'} is not an NES palette index; use "$00"–"$3F"`
        );
        return undefined;
    }

    if (index === 0x0d) {
        sink.warning(
            'palette-index',
            file,
            path,
            `${formatPaletteIndex(index)} is "blacker than black" and can upset TV sync; use $0F for black`
        );
    }
    return index;
}

function parseScale(value: unknown, file: string, sink: DiagnosticSink): number {
    if (value === undefined) {
        return DEFAULT_SCALE;
    }

    const scale = isRecord(value) ? value.scale : undefined;
    if (typeof scale !== 'number' || !Number.isInteger(scale) || scale < 1 || scale > MAX_SCALE) {
        sink.error('schema', file, 'preview.scale', `preview scale must be an integer from 1 to ${MAX_SCALE}`);
        return DEFAULT_SCALE;
    }
    return scale;
}

function stringArray(value: unknown, path: string, file: string, sink: DiagnosticSink): string[] | undefined {
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
        sink.error('schema', file, path, `"${path}" must be an array of file paths relative to the screen`);
        return undefined;
    }
    return value;
}

function optionalArray(value: unknown, path: string, file: string, sink: DiagnosticSink): unknown[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        sink.error('schema', file, path, `"${path}" must be an array`);
        return [];
    }
    return value;
}

export { parseScreen };
export type { ScreenPalettes, ScreenSource };
