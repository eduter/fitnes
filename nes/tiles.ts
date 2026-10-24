import type { DiagnosticSink } from './diagnostics.ts';
import { TILE_SIZE } from './hardware.ts';

/** One 8 × 8, 2-bit-per-pixel pattern: 64 values in 0–3, row-major. */
type Pattern = Uint8Array;

/** Pixel art parsed from rows of `0`–`3` characters, `.` standing for 0. */
interface PixelArt {
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8Array;
}

const PIXEL_VALUES: Record<string, number> = { '.': 0, '0': 0, '1': 1, '2': 2, '3': 3 };

/**
 * Parse pixel art and check its shape. With `exactTile` the art must be
 * one 8 × 8 tile; otherwise both sides must be whole multiples of 8 so the
 * art slices into tiles with nothing left over.
 */
function parsePixelArt(
    value: unknown,
    options: { file: string; path: string; exactTile: boolean },
    sink: DiagnosticSink
): PixelArt | undefined {
    const { file, path, exactTile } = options;

    if (!Array.isArray(value) || value.length === 0 || !value.every((row) => typeof row === 'string')) {
        sink.error('schema', file, path, 'pixel art must be a non-empty array of strings');
        return undefined;
    }

    const rows: string[] = value;
    const width = rows[0].length;
    const height = rows.length;

    const ragged = rows.findIndex((row) => row.length !== width);
    if (ragged !== -1) {
        sink.error(
            'tile-size',
            file,
            `${path}[${ragged}]`,
            `row is ${rows[ragged].length} pixels wide, row 0 is ${width}; every row must be the same width`
        );
        return undefined;
    }

    if (exactTile && (width !== TILE_SIZE || height !== TILE_SIZE)) {
        sink.error('tile-size', file, path, `tile is ${width}×${height} pixels; NES tiles are exactly 8×8`);
        return undefined;
    }

    if (width % TILE_SIZE !== 0 || height % TILE_SIZE !== 0) {
        sink.error(
            'tile-size',
            file,
            path,
            `art is ${width}×${height} pixels; both sides must be multiples of 8 to slice into tiles`
        );
        return undefined;
    }

    // Decode 2-bit values; one tile can therefore never hold more than four
    const pixels = new Uint8Array(width * height);
    let valid = true;
    for (const [y, row] of rows.entries()) {
        for (const [x, char] of [...row].entries()) {
            const pixel = PIXEL_VALUES[char];
            if (pixel === undefined) {
                sink.error(
                    'tile-pixel',
                    file,
                    `${path}[${y}]`,
                    `pixel '${char}' at (${x},${y}) is not a 2-bit value; use 0–3 ('.' = 0)`
                );
                valid = false;
                continue;
            }
            pixels[y * width + x] = pixel;
        }
    }

    if (!valid) {
        return undefined;
    }
    return { width, height, pixels };
}

/** Cut pixel art into 8 × 8 patterns, returned as rows of tiles. */
function sliceArt(art: PixelArt): Pattern[][] {
    const cols = art.width / TILE_SIZE;
    const rows = art.height / TILE_SIZE;
    const tiles: Pattern[][] = [];

    for (let row = 0; row < rows; row++) {
        const line: Pattern[] = [];
        for (let col = 0; col < cols; col++) {
            const pattern = new Uint8Array(TILE_SIZE * TILE_SIZE);
            for (let y = 0; y < TILE_SIZE; y++) {
                for (let x = 0; x < TILE_SIZE; x++) {
                    pattern[y * TILE_SIZE + x] = art.pixels[(row * TILE_SIZE + y) * art.width + col * TILE_SIZE + x];
                }
            }
            line.push(pattern);
        }
        tiles.push(line);
    }

    return tiles;
}

/**
 * Rewrite pixel values through `mapping` (index = old value). This is a
 * CHR-build step: the result is a new pattern that takes its own slot.
 */
function remapPattern(pattern: Pattern, mapping: readonly number[]): Pattern {
    return pattern.map((value) => mapping[value]);
}

/** A string that is equal for byte-identical patterns, for pattern-table deduplication. */
function patternKey(pattern: Pattern): string {
    return pattern.join('');
}

/** True when every pixel is 0, so the tile shows only the universal color under any subpalette. */
function isBlankPattern(pattern: Pattern): boolean {
    return pattern.every((value) => value === 0);
}

export { isBlankPattern, parsePixelArt, patternKey, remapPattern, sliceArt };
export type { Pattern, PixelArt };
