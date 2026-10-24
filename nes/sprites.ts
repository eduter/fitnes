import { isRecord, type TileLibrary } from './assets.ts';
import type { DiagnosticCode, DiagnosticSink } from './diagnostics.ts';
import {
    MAX_SPRITES,
    MAX_SPRITES_PER_SCANLINE,
    PATTERN_TABLE_TILES,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SUBPALETTE_COUNT,
    TILE_SIZE,
} from './hardware.ts';
import type { Pattern } from './tiles.ts';

/** One sprite after flips are baked in. Index 0 is the front-most sprite. */
interface CompiledSprite {
    readonly index: number;
    readonly x: number;
    readonly y: number;
    readonly height: number;
    readonly palette: number;
    readonly pixels: Uint8Array;
    readonly behind: boolean;
}

const FIELDS = new Set(['id', 'tile', 'below', 'x', 'y', 'palette', 'flipX', 'flipY', 'priority']);

/**
 * Turn sprite entries into pixels and enforce the pattern-table, sprite-count,
 * and per-scanline limits. Overflow is reported; nothing is dropped, so a
 * screen that breaks a limit cannot come back as valid.
 */
function compileSprites(
    entries: readonly unknown[],
    input: { size: '8x8' | '8x16'; library: TileLibrary; file: string },
    sink: DiagnosticSink
): CompiledSprite[] {
    const { size, library, file } = input;
    const height = size === '8x16' ? 16 : 8;
    const sprites: CompiledSprite[] = [];
    const patterns = new Map<string, Pattern>();

    if (entries.length > MAX_SPRITES) {
        sink.error(
            'sprite-limit',
            file,
            'sprites',
            `${entries.length} sprites exceed the limit of ${MAX_SPRITES}; later entries would never be evaluated`
        );
    }

    for (const [index, entry] of entries.entries()) {
        const sprite = compileOne(entry, { index, height, library, file, patterns }, sink);
        if (sprite !== undefined) {
            sprites.push(sprite);
        }
    }

    if (patterns.size > PATTERN_TABLE_TILES) {
        sink.error(
            'pattern-limit',
            file,
            'sprites',
            `sprites use ${patterns.size} distinct patterns; a sprite pattern table holds ${PATTERN_TABLE_TILES}`
        );
    }

    reportScanlines(sprites, file, sink);
    return sprites;
}

function compileOne(
    entry: unknown,
    input: {
        index: number;
        height: number;
        library: TileLibrary;
        file: string;
        patterns: Map<string, Pattern>;
    },
    sink: DiagnosticSink
): CompiledSprite | undefined {
    const { index, height, library, file, patterns } = input;
    const path = `sprites[${index}]`;

    if (!isRecord(entry)) {
        sink.error('schema', file, path, 'sprite must be an object');
        return undefined;
    }

    for (const key of Object.keys(entry)) {
        if (!FIELDS.has(key)) {
            sink.error('schema', file, `${path}.${key}`, `unknown sprite field '${key}'`);
        }
    }

    const tile = spriteTile(entry.tile, 'tile', { path, library, file, patterns }, sink);
    const below = height === 16 ? spriteTile(entry.below, 'below', { path, library, file, patterns }, sink) : undefined;
    if (height === 8 && entry.below !== undefined) {
        sink.error('schema', file, `${path}.below`, '"below" is only used by 8×16 sprites; this screen is 8×8');
    }

    const x = integer(entry.x, `${path}.x`, -(TILE_SIZE - 1), SCREEN_WIDTH - 1, file, sink);
    const y = integer(entry.y, `${path}.y`, -(height - 1), SCREEN_HEIGHT - 1, file, sink);
    const palette = integer(entry.palette, `${path}.palette`, 0, SUBPALETTE_COUNT - 1, file, sink, 'palette-reference');
    const flipX = flag(entry.flipX, `${path}.flipX`, file, sink);
    const flipY = flag(entry.flipY, `${path}.flipY`, file, sink);
    const behind = priority(entry.priority, path, file, sink);

    if (tile === undefined || x === undefined || y === undefined || palette === undefined || behind === undefined) {
        return undefined;
    }
    if (height === 16 && below === undefined) {
        return undefined;
    }

    return {
        index,
        x,
        y,
        height,
        palette,
        behind,
        pixels: bakedPixels(tile, below, { height, flipX, flipY }),
    };
}

function spriteTile(
    value: unknown,
    field: string,
    input: { path: string; library: TileLibrary; file: string; patterns: Map<string, Pattern> },
    sink: DiagnosticSink
): Pattern | undefined {
    const { path, library, file, patterns } = input;
    if (typeof value !== 'string') {
        sink.error('schema', file, `${path}.${field}`, `'${field}' must be a sprite tile name`);
        return undefined;
    }

    const tile = library.sprite.get(value);
    if (tile === undefined) {
        const known = [...library.sprite.keys()].slice(0, 6).join(', ');
        const hint = known === '' ? '' : `; sprite tiles: ${known}`;
        sink.error('tile-reference', file, `${path}.${field}`, `unknown sprite tile '${value}'${hint}`);
        return undefined;
    }

    patterns.set(value, tile.pattern);
    return tile.pattern;
}

/** Index 0 stays in front: sprites are painted from the last entry back to the first. */
function bakedPixels(
    top: Pattern,
    below: Pattern | undefined,
    options: { height: number; flipX: boolean; flipY: boolean }
): Uint8Array {
    const { height, flipX, flipY } = options;
    const pixels = new Uint8Array(height * TILE_SIZE);
    const halves = below === undefined ? [top] : [top, below];

    for (let y = 0; y < height; y++) {
        const sourceY = flipY ? height - 1 - y : y;
        const pattern = halves[Math.floor(sourceY / TILE_SIZE)];
        const localY = sourceY % TILE_SIZE;
        for (let x = 0; x < TILE_SIZE; x++) {
            const sourceX = flipX ? TILE_SIZE - 1 - x : x;
            pixels[y * TILE_SIZE + x] = pattern[localY * TILE_SIZE + sourceX];
        }
    }

    return pixels;
}

function reportScanlines(sprites: readonly CompiledSprite[], file: string, sink: DiagnosticSink): void {
    const hits: number[][] = Array.from({ length: SCREEN_HEIGHT }, () => []);

    for (const sprite of sprites) {
        const start = Math.max(0, sprite.y);
        const end = Math.min(SCREEN_HEIGHT, sprite.y + sprite.height);
        for (let y = start; y < end; y++) {
            hits[y].push(sprite.index);
        }
    }

    const overflow = hits.flatMap((line, y) => (line.length > MAX_SPRITES_PER_SCANLINE ? [{ y, line }] : []));
    const first = overflow[0];
    if (first === undefined) {
        return;
    }

    const more = overflow.length > 1 ? ` ${overflow.length} scanlines are over the limit; the first is` : '';
    sink.error(
        'sprite-scanline-limit',
        file,
        `sprites[${first.line[MAX_SPRITES_PER_SCANLINE]}]`,
        `scanline ${first.y} has ${first.line.length} sprites (limit ${MAX_SPRITES_PER_SCANLINE}); sprite indexes ${first.line.join(', ')}.${more} Hardware drops the later sprites, and this screen is rejected instead`
    );
}

function integer(
    value: unknown,
    path: string,
    min: number,
    max: number,
    file: string,
    sink: DiagnosticSink,
    code: DiagnosticCode = 'out-of-bounds'
): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        sink.error(code, file, path, `${JSON.stringify(value)} is outside ${min}–${max}`);
        return undefined;
    }
    return value;
}

function flag(value: unknown, path: string, file: string, sink: DiagnosticSink): boolean {
    if (value === undefined) {
        return false;
    }
    if (typeof value !== 'boolean') {
        sink.error('schema', file, path, 'must be a boolean');
        return false;
    }
    return value;
}

function priority(value: unknown, path: string, file: string, sink: DiagnosticSink): boolean | undefined {
    if (value === undefined || value === 'front') {
        return false;
    }
    if (value === 'back') {
        return true;
    }
    sink.error('schema', file, `${path}.priority`, `priority ${JSON.stringify(value)} must be "front" or "back"`);
    return undefined;
}

export { compileSprites };
export type { CompiledSprite };
