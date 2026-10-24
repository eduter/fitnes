import {
    ATTRIBUTE_REGION_SIZE,
    PATTERN_TABLE_TILES,
    SCREEN_WIDTH,
    SUBPALETTE_COLORS,
    SUBPALETTE_COUNT,
    TILE_SIZE,
} from './hardware.ts';
import { formatPaletteIndex, type MasterPalette } from './palette.ts';
import type { RgbImage } from './png.ts';

/** One way a captured picture breaks the background rules. */
interface PictureProblem {
    readonly code:
        | 'attribute-colors'
        | 'off-palette'
        | 'pattern-limit'
        | 'picture-size'
        | 'subpalette-limit'
        | 'tile-colors';
    readonly message: string;
}

const TILE_AREA = TILE_SIZE * TILE_SIZE;

/**
 * Decide whether a screenshot could be an NES background.
 *
 * The column is 256 pixels wide and may be taller than 240, because a workout
 * scrolls. Every pixel must be a master-palette color. Each 8×8 tile holds at
 * most four of those colors, each 16×16 region shares one subpalette, the
 * picture uses at most four subpalettes, and distinct tiles fit in one pattern
 * table. Sprites are not inferred: a color that only a sprite could add fails
 * here, which keeps the page drawable as a background.
 */
function assessPicture(image: RgbImage, palette: MasterPalette): PictureProblem[] {
    const { width, height } = image;

    if (width !== SCREEN_WIDTH || height < ATTRIBUTE_REGION_SIZE || height % ATTRIBUTE_REGION_SIZE !== 0) {
        return [
            {
                code: 'picture-size',
                message: `picture is ${width}×${height}; the column is ${SCREEN_WIDTH} wide and the height is a multiple of ${ATTRIBUTE_REGION_SIZE}`,
            },
        ];
    }

    const indexOf = paletteIndex(palette);
    const indexes = new Uint16Array(width * height);
    const problems: PictureProblem[] = [];

    // Off-palette pixels are blends, gradients, or a color outside the 64
    let offPalette = 0;
    let firstOff = '';
    for (let i = 0; i < indexes.length; i++) {
        const offset = i * 3;
        const index = indexOf.get(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`);
        if (index === undefined) {
            offPalette += 1;
            if (firstOff === '') {
                firstOff = `(${i % width},${Math.floor(i / width)})`;
            }
            indexes[i] = 0xffff;
            continue;
        }
        indexes[i] = index;
    }
    if (offPalette > 0) {
        problems.push({
            code: 'off-palette',
            message: `${offPalette} pixels are not in the master palette, first at ${firstOff}`,
        });
    }

    const regionCols = width / ATTRIBUTE_REGION_SIZE;
    const regionRows = height / ATTRIBUTE_REGION_SIZE;
    const regionColors: number[][] = [];
    const patterns = new Set<string>();
    let tileReports = 0;
    let regionReports = 0;

    for (let regionY = 0; regionY < regionRows; regionY++) {
        for (let regionX = 0; regionX < regionCols; regionX++) {
            const colors = new Set<number>();

            for (let tileY = regionY * 2; tileY < regionY * 2 + 2; tileY++) {
                for (let tileX = regionX * 2; tileX < regionX * 2 + 2; tileX++) {
                    const tile = new Set<number>();
                    const signature: number[] = [];

                    for (let y = 0; y < TILE_SIZE; y++) {
                        for (let x = 0; x < TILE_SIZE; x++) {
                            const index = indexes[(tileY * TILE_SIZE + y) * width + tileX * TILE_SIZE + x] ?? 0;
                            if (index === 0xffff) {
                                continue;
                            }
                            tile.add(index);
                            colors.add(index);
                            signature.push(index);
                        }
                    }

                    if (signature.length === TILE_AREA) {
                        patterns.add(signature.join(','));
                    }
                    if (tile.size > SUBPALETTE_COLORS + 1 && tileReports < 4) {
                        tileReports += 1;
                        problems.push({
                            code: 'tile-colors',
                            message: `tile (${tileX},${tileY}) at pixels x ${tileX * TILE_SIZE}–${tileX * TILE_SIZE + TILE_SIZE - 1}, y ${tileY * TILE_SIZE}–${tileY * TILE_SIZE + TILE_SIZE - 1} uses ${tile.size} colors (${formatColors(tile)}); a tile holds ${SUBPALETTE_COLORS + 1}`,
                        });
                    }
                }
            }

            regionColors.push([...colors]);
            if (colors.size > SUBPALETTE_COLORS + 1 && regionReports < 4) {
                regionReports += 1;
                problems.push({
                    code: 'attribute-colors',
                    message: `attribute region (${regionX},${regionY}) at pixels x ${regionX * ATTRIBUTE_REGION_SIZE}–${regionX * ATTRIBUTE_REGION_SIZE + ATTRIBUTE_REGION_SIZE - 1}, y ${regionY * ATTRIBUTE_REGION_SIZE}–${regionY * ATTRIBUTE_REGION_SIZE + ATTRIBUTE_REGION_SIZE - 1} uses ${colors.size} colors (${formatColors(colors)}); the four tiles share one subpalette`,
                });
            }
        }
    }

    if (!assignSubpalettes(regionColors)) {
        problems.push({
            code: 'subpalette-limit',
            message: `regions need more than ${SUBPALETTE_COUNT} background subpalettes sharing one universal color`,
        });
    }

    if (patterns.size > PATTERN_TABLE_TILES) {
        problems.push({
            code: 'pattern-limit',
            message: `picture uses ${patterns.size} distinct tiles; a background pattern table holds ${PATTERN_TABLE_TILES}`,
        });
    }

    return problems;
}

/** First palette index of each distinct RGB. Duplicate blacks and whites are one visible color. */
function paletteIndex(palette: MasterPalette): Map<string, number> {
    const indexOf = new Map<string, number>();

    palette.colors.forEach((color, index) => {
        const key = `${color.r},${color.g},${color.b}`;
        if (!indexOf.has(key)) {
            indexOf.set(key, index);
        }
    });

    return indexOf;
}

/**
 * True when every region's colors fit in four 4-color subpalettes that share
 * one universal entry. A region may omit the universal color.
 */
function assignSubpalettes(regions: readonly number[][]): boolean {
    const candidates = [...new Set(regions.flat())];

    return candidates.some((universal) => {
        const extras = regions.map((colors) => colors.filter((color) => color !== universal).sort((a, b) => a - b));
        if (extras.some((extra) => extra.length > SUBPALETTE_COLORS)) {
            return false;
        }

        const unique = uniqueExtras(extras);
        return place(unique, []);
    });
}

function uniqueExtras(extras: readonly number[][]): number[][] {
    const seen = new Set<string>();
    const unique: number[][] = [];

    for (const extra of extras) {
        const key = extra.join(',');
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(extra);
    }

    unique.sort((a, b) => b.length - a.length);
    return unique;
}

/** Place the largest remaining color sets first. Four subpalettes are the whole background budget. */
function place(remaining: readonly number[][], palettes: readonly number[][]): boolean {
    const [extra, ...rest] = remaining;
    if (extra === undefined) {
        return true;
    }

    for (let index = 0; index < palettes.length; index++) {
        const palette = palettes[index] ?? [];
        const missing = extra.filter((color) => !palette.includes(color));
        if (palette.length + missing.length > SUBPALETTE_COLORS) {
            continue;
        }
        const next = palettes.map((colors, paletteIndex) =>
            paletteIndex === index ? [...palette, ...missing] : colors
        );
        if (place(rest, next)) {
            return true;
        }
    }

    if (palettes.length >= SUBPALETTE_COUNT) {
        return false;
    }

    return place(rest, [...palettes, [...extra]]);
}

function formatColors(colors: ReadonlySet<number>): string {
    return [...colors]
        .sort((a, b) => a - b)
        .map((color) => formatPaletteIndex(color))
        .join(', ');
}

export type { PictureProblem };
export { assessPicture };
