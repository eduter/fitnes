import {
    ATTRIBUTE_REGION_SIZE,
    MAX_SPRITES,
    MAX_SPRITES_PER_SCANLINE,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    SUBPALETTE_COLORS,
    SUBPALETTE_COUNT,
    TILE_SIZE,
} from './hardware.ts';
import { formatPaletteIndex, type MasterPalette } from './palette.ts';
import type { RgbImage } from './png.ts';
import { type SearchBudget, SearchLimit } from './searchLimit.ts';

/** One way a captured picture breaks the console rules. */
interface PictureProblem {
    readonly code:
        | 'color-limit'
        | 'off-palette'
        | 'picture-size'
        | 'sprite-limit'
        | 'sprite-palette'
        | 'sprite-scanline-limit'
        | 'subpalette-limit';
    readonly message: string;
}

interface RegionHist {
    readonly counts: number[];
}

interface PaletteChoice {
    color: number;
    count: number;
}

interface PlacedSprite {
    readonly y: number;
    readonly height: number;
    readonly colors: readonly number[];
}

interface Placement {
    readonly y: number;
    readonly colors: readonly number[];
    readonly covered: readonly number[];
}

interface Failure {
    readonly problem: PictureProblem;
    readonly overflow: number;
}

type Attempt = { readonly ok: true } | { readonly ok: false; readonly failure: Failure };

const PALETTE_ENTRIES = 64;
const SPRITE_WIDTH = TILE_SIZE;
/** 8×8 and 8×16 are the two sizes the PPU can select for the whole frame. */
const SPRITE_HEIGHTS = [8, 16] as const;
const MAX_SPRITE_COLORS = SUBPALETTE_COUNT * SUBPALETTE_COLORS;
/** Eight sprites, each eight pixels wide, with no overlap. */
const MAX_SPRITE_PIXELS = MAX_SPRITES_PER_SCANLINE * SPRITE_WIDTH;

/**
 * Construct a legal background/sprite decomposition when the search can find one.
 *
 * The column is 256 pixels wide and may be taller than 240, because a workout
 * scrolls. Every pixel must be a master-palette color. The background is four
 * subpalettes sharing one universal color, one subpalette per 16×16 region.
 * Pixels that do not fit that background are a sprite layer: four sprite
 * subpalettes of three colors, eight sprites on a scanline, and 64 sprites in
 * any 240-line window. There is no mid-frame palette swap and no per-tile
 * attribute table. Tile pattern counts are unrestricted. Search failures are
 * inconclusive, not proof that no decomposition exists.
 */
function assessPicture(
    image: RgbImage,
    palette: MasterPalette,
    budget: SearchBudget = { left: 100_000 }
): PictureProblem[] {
    const { width, height } = image;

    if (width !== SCREEN_WIDTH || !Number.isSafeInteger(height) || height < 1) {
        return [
            {
                code: 'picture-size',
                message: `picture is ${width}×${height}; the column is ${SCREEN_WIDTH} wide and height is a positive integer`,
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

    if (offPalette > 0) {
        return problems;
    }
    const visibleColors = new Set(indexes).size;
    if (visibleColors > 25) {
        return [
            {
                code: 'color-limit',
                message: `Picture uses ${visibleColors} visible colors; background and sprite palettes hold at most 25 together`,
            },
        ];
    }

    const hists = regionHists(indexes, width, height);
    const lists = colorLists(hists);

    // A legal background needs no sprite budget. Skip the search.
    if (lists.every((colors) => colors.length === 0) || assignSubpalettes(lists, budget)) {
        return problems;
    }

    const layered = explainLayers(indexes, hists, width, height, budget);
    if (!layered.ok) {
        problems.push(layered.failure.problem);
        return problems;
    }

    return problems;
}

/**
 * Keep the widest, most common colors on the background and cover the rest
 * with sprites. The budgets are the hardware limits; the split itself prefers
 * a full-width color over a busier shape that could have been a sprite.
 */
function explainLayers(
    indexes: Uint16Array,
    hists: readonly RegionHist[],
    width: number,
    height: number,
    budget: SearchBudget
): Attempt {
    const wide = wideColors(indexes, width, height);
    const universals = colorsByFrequency(hists);
    if (universals.length === 0) {
        return { ok: true };
    }

    // The most common color is the backdrop we report against. A later color can
    // still accept the picture, but its failure is usually a worse split.
    let best: Failure | undefined;
    for (const universal of universals) {
        const attempt = explainUniversal(indexes, hists, width, height, universal, wide, budget);
        if (attempt.ok) {
            return attempt;
        }
        if (best === undefined) {
            best = attempt.failure;
        }
    }

    if (best === undefined) {
        return {
            ok: false,
            failure: {
                overflow: 1,
                problem: {
                    code: 'subpalette-limit',
                    message: `regions need more than ${SUBPALETTE_COUNT} background subpalettes sharing one universal color`,
                },
            },
        };
    }
    return { ok: false, failure: best };
}

function explainUniversal(
    indexes: Uint16Array,
    hists: readonly RegionHist[],
    width: number,
    height: number,
    universal: number,
    wide: ReadonlySet<number>,
    budget: SearchBudget
): Attempt {
    const proposals = hists.map((hist) => propose(hist.counts, universal, wide));

    // Each spill removes one color. Empty proposals always fit in the background.
    let guard = hists.length * SUBPALETTE_COLORS;
    while (!proposalsFit(proposals, budget)) {
        if (guard <= 0 || !spillCheapest(proposals)) {
            break;
        }
        guard -= 1;
    }

    const sprite = spriteMask(indexes, width, height, universal, proposals);
    const cover = coverSprites(indexes, sprite, width, height, budget);
    if (!cover.ok) {
        return cover;
    }
    return { ok: true };
}

function coverSprites(
    indexes: Uint16Array,
    sprite: Uint8Array,
    width: number,
    height: number,
    budget: SearchBudget
): Attempt {
    if (!sprite.includes(1)) {
        return { ok: true };
    }

    const colors = distinctSpriteColors(indexes, sprite);
    if (colors.length > MAX_SPRITE_COLORS) {
        return failure(
            'sprite-palette',
            `sprite pixels use ${colors.length} colors (${formatColorList(colors)}); four sprite subpalettes hold ${MAX_SPRITE_COLORS}`,
            colors.length - MAX_SPRITE_COLORS
        );
    }

    const pixels = tooManySpritePixels(sprite, width, height);
    if (pixels !== undefined) {
        return { ok: false, failure: pixels };
    }
    const windows = tooManySpriteWindows(sprite, width, height);
    if (windows !== undefined) {
        return { ok: false, failure: windows };
    }

    // 8×8 first. 8×16 spends one OAM slot on two tile rows, which helps a tall
    // shape and hurts when the rows need different horizontal positions.
    let best: Failure | undefined;
    let windowHit: Failure | undefined;
    for (const spriteHeight of SPRITE_HEIGHTS) {
        const grouped = layoutSprites(indexes, sprite, width, height, spriteHeight, SUBPALETTE_COLORS, budget);
        if (grouped.ok) {
            return grouped;
        }
        best = tighter(best, grouped.failure);
        if (grouped.failure.problem.code === 'sprite-limit') {
            windowHit = tighter(windowHit, grouped.failure);
        }
        if (grouped.failure.problem.code !== 'sprite-palette') {
            continue;
        }
        const split = layoutSprites(indexes, sprite, width, height, spriteHeight, 1, budget);
        if (split.ok) {
            return split;
        }
        best = tighter(best, split.failure);
        if (split.failure.problem.code === 'sprite-limit') {
            windowHit = tighter(windowHit, split.failure);
        }
    }

    // A mode that got every scanline under eight sprites and then ran out of
    // OAM slots is the limit the picture actually hit.
    if (windowHit !== undefined) {
        return { ok: false, failure: windowHit };
    }
    if (best === undefined) {
        return failure('sprite-limit', `sprites do not fit in ${MAX_SPRITES} slots`, 1);
    }
    return { ok: false, failure: best };
}

function layoutSprites(
    indexes: Uint16Array,
    sprite: Uint8Array,
    width: number,
    height: number,
    spriteHeight: number,
    maxColors: number,
    budget: SearchBudget
): Attempt {
    const alive = sprite.slice();
    const open: number[] = [];
    for (let i = 0; i < alive.length; i++) {
        if (alive[i] === 1) {
            open.push(i);
        }
    }

    const placed: PlacedSprite[] = [];
    const onLine = new Uint16Array(height);
    let cursor = 0;
    while (cursor < open.length) {
        while (cursor < open.length && aliveAt(alive, open[cursor]) !== 1) {
            cursor += 1;
        }
        if (cursor >= open.length) {
            break;
        }
        const seedIndex = open[cursor] ?? 0;
        const seedX = seedIndex % width;
        const seedY = Math.floor(seedIndex / width);
        const seedColor = indexes[seedIndex] ?? 0;
        const best = bestPlacement(alive, indexes, width, height, seedX, seedY, seedColor, spriteHeight, maxColors);
        if (best === undefined || !best.covered.includes(seedIndex)) {
            return failure(
                'sprite-scanline-limit',
                `sprite pixel at (${seedX},${seedY}) does not fit in an 8×${spriteHeight} sprite`,
                1
            );
        }

        // The OAM entry counts on every line of its box, including transparent rows
        for (let y = best.y; y < best.y + spriteHeight && y < height; y++) {
            onLine[y] = (onLine[y] ?? 0) + 1;
            const used = onLine[y] ?? 0;
            if (used > MAX_SPRITES_PER_SCANLINE) {
                return failure(
                    'sprite-scanline-limit',
                    `scanline y ${y} needs ${used} sprites; the hardware draws ${MAX_SPRITES_PER_SCANLINE} on a line`,
                    used - MAX_SPRITES_PER_SCANLINE
                );
            }
        }
        for (const index of best.covered) {
            alive[index] = 0;
        }
        // Lines past the picture are not on a scroll window
        const visibleHeight = Math.min(spriteHeight, height - best.y);
        placed.push({ y: best.y, height: visibleHeight, colors: best.colors });
        cursor += 1;
    }

    const crowded = windowFailure(placed, height);
    if (crowded !== undefined) {
        return { ok: false, failure: crowded };
    }
    if (!spritesPack(placed, budget)) {
        return failure('sprite-palette', 'sprite pixels do not fit in four subpalettes of three colors', 1);
    }
    return { ok: true };
}

function bestPlacement(
    alive: Uint8Array,
    indexes: Uint16Array,
    width: number,
    height: number,
    seedX: number,
    seedY: number,
    seedColor: number,
    spriteHeight: number,
    maxColors: number
): Placement | undefined {
    let best: Placement | undefined;
    for (let dy = 0; dy < spriteHeight; dy++) {
        const top = seedY - dy;
        if (top < 0) {
            continue;
        }
        for (let dx = 0; dx < SPRITE_WIDTH; dx++) {
            const left = seedX - dx;
            if (left < 0 || left + SPRITE_WIDTH > width) {
                continue;
            }
            const bins = new Map<number, number[]>();
            for (let y = top; y < top + spriteHeight && y < height; y++) {
                for (let x = left; x < left + SPRITE_WIDTH; x++) {
                    const index = y * width + x;
                    if (alive[index] !== 1) {
                        continue;
                    }
                    const color = indexes[index] ?? 0;
                    const list = bins.get(color);
                    if (list === undefined) {
                        bins.set(color, [index]);
                    } else {
                        list.push(index);
                    }
                }
            }
            const chosen = chooseColors(bins, seedColor, maxColors);
            if (chosen.covered.length === 0) {
                continue;
            }
            if (best === undefined || chosen.covered.length > best.covered.length) {
                best = { y: top, colors: chosen.colors, covered: chosen.covered };
            }
        }
    }
    return best;
}

function chooseColors(
    bins: Map<number, number[]>,
    seedColor: number,
    maxColors: number
): { colors: number[]; covered: number[] } {
    const ranked = [...bins.keys()].filter((color) => color !== seedColor);
    ranked.sort((a, b) => (bins.get(b)?.length ?? 0) - (bins.get(a)?.length ?? 0) || a - b);
    const colors = [seedColor];
    for (const color of ranked) {
        if (colors.length >= maxColors) {
            break;
        }
        colors.push(color);
    }
    const covered: number[] = [];
    for (const color of colors) {
        const list = bins.get(color);
        if (list !== undefined) {
            covered.push(...list);
        }
    }
    colors.sort((a, b) => a - b);
    return { colors, covered };
}

/** Colors that exceed the sprite pixel budget on any line, so they have to be background somewhere. */
function wideColors(indexes: Uint16Array, width: number, height: number): Set<number> {
    const wide = new Set<number>();
    const counts = new Uint16Array(PALETTE_ENTRIES);
    for (let y = 0; y < height; y++) {
        counts.fill(0);
        const row = y * width;
        for (let x = 0; x < width; x++) {
            const color = indexes[row + x] ?? 0;
            if (color === 0xffff || color >= PALETTE_ENTRIES) {
                continue;
            }
            counts[color] = (counts[color] ?? 0) + 1;
        }
        for (let color = 0; color < counts.length; color++) {
            if ((counts[color] ?? 0) > MAX_SPRITE_PIXELS) {
                wide.add(color);
            }
        }
    }
    return wide;
}

function tooManySpritePixels(sprite: Uint8Array, width: number, height: number): Failure | undefined {
    for (let y = 0; y < height; y++) {
        let count = 0;
        const row = y * width;
        for (let x = 0; x < width; x++) {
            if (sprite[row + x] === 1) {
                count += 1;
            }
        }
        if (count > MAX_SPRITE_PIXELS) {
            return {
                overflow: count - MAX_SPRITE_PIXELS,
                problem: {
                    code: 'sprite-scanline-limit',
                    message: `scanline y ${y} has ${count} sprite pixels; eight sprites cover at most ${MAX_SPRITE_PIXELS}`,
                },
            };
        }
    }
    return undefined;
}

function tooManySpriteWindows(sprite: Uint8Array, width: number, height: number): Failure | undefined {
    for (let y = 0; y < height; y++) {
        const xs: number[] = [];
        const row = y * width;
        for (let x = 0; x < width; x++) {
            if (sprite[row + x] === 1) {
                xs.push(x);
            }
        }
        const needed = coverCount(xs);
        if (needed > MAX_SPRITES_PER_SCANLINE) {
            return {
                overflow: needed - MAX_SPRITES_PER_SCANLINE,
                problem: {
                    code: 'sprite-scanline-limit',
                    message: `scanline y ${y} needs ${needed} sprites; the hardware draws ${MAX_SPRITES_PER_SCANLINE} on a line`,
                },
            };
        }
    }
    return undefined;
}

function coverCount(xs: readonly number[]): number {
    let count = 0;
    let index = 0;
    while (index < xs.length) {
        const start = xs[index] ?? 0;
        count += 1;
        while (index < xs.length && (xs[index] ?? 0) <= start + SPRITE_WIDTH - 1) {
            index += 1;
        }
    }
    return count;
}

/**
 * 64 sprites is one screen of OAM. A window is 240 lines because that is what
 * a scroll position shows; a taller page may reuse the slots further down.
 */
function windowFailure(sprites: readonly PlacedSprite[], imageHeight: number): Failure | undefined {
    if (sprites.length === 0) {
        return undefined;
    }
    if (imageHeight <= SCREEN_HEIGHT) {
        if (sprites.length <= MAX_SPRITES) {
            return undefined;
        }
        return {
            overflow: sprites.length - MAX_SPRITES,
            problem: {
                code: 'sprite-limit',
                message: `a 240-line window starting at y 0 holds ${sprites.length} sprites; the screen holds ${MAX_SPRITES}`,
            },
        };
    }

    const lastStart = imageHeight - SCREEN_HEIGHT;
    const diff = new Int32Array(lastStart + 2);
    for (const sprite of sprites) {
        const first = Math.max(0, sprite.y - (SCREEN_HEIGHT - 1));
        const last = Math.min(lastStart, sprite.y + sprite.height - 1);
        if (first > last) {
            continue;
        }
        diff[first] = (diff[first] ?? 0) + 1;
        diff[last + 1] = (diff[last + 1] ?? 0) - 1;
    }

    let active = 0;
    for (let start = 0; start <= lastStart; start++) {
        active += diff[start] ?? 0;
        if (active > MAX_SPRITES) {
            return {
                overflow: active - MAX_SPRITES,
                problem: {
                    code: 'sprite-limit',
                    message: `a 240-line window starting at y ${start} holds ${active} sprites; the screen holds ${MAX_SPRITES}`,
                },
            };
        }
    }
    return undefined;
}

function spritesPack(sprites: readonly PlacedSprite[], budget: SearchBudget): boolean {
    const extras = sprites.map((sprite) => [...sprite.colors].sort((a, b) => a - b));
    return place(uniqueExtras(extras), [], budget);
}

function regionHists(indexes: Uint16Array, width: number, height: number): RegionHist[] {
    const cols = width / ATTRIBUTE_REGION_SIZE;
    const rows = Math.ceil(height / ATTRIBUTE_REGION_SIZE);
    const hists: RegionHist[] = Array.from({ length: cols * rows }, () => ({
        counts: new Array<number>(PALETTE_ENTRIES).fill(0),
    }));
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const color = indexes[y * width + x] ?? 0;
            if (color === 0xffff || color >= PALETTE_ENTRIES) {
                continue;
            }
            const region = Math.floor(y / ATTRIBUTE_REGION_SIZE) * cols + Math.floor(x / ATTRIBUTE_REGION_SIZE);
            const hist = hists[region];
            if (hist === undefined) {
                continue;
            }
            hist.counts[color] = (hist.counts[color] ?? 0) + 1;
        }
    }
    return hists;
}

function colorLists(hists: readonly RegionHist[]): number[][] {
    return hists.map((hist) => {
        const colors: number[] = [];
        for (let color = 0; color < hist.counts.length; color++) {
            if ((hist.counts[color] ?? 0) > 0) {
                colors.push(color);
            }
        }
        return colors;
    });
}

function colorsByFrequency(hists: readonly RegionHist[]): number[] {
    const totals = new Array<number>(PALETTE_ENTRIES).fill(0);
    for (const hist of hists) {
        for (let color = 0; color < hist.counts.length; color++) {
            totals[color] = (totals[color] ?? 0) + (hist.counts[color] ?? 0);
        }
    }
    const colors: number[] = [];
    for (let color = 0; color < totals.length; color++) {
        if ((totals[color] ?? 0) > 0) {
            colors.push(color);
        }
    }
    colors.sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0) || a - b);
    return colors;
}

function propose(counts: readonly number[], universal: number, wide: ReadonlySet<number>): PaletteChoice[] {
    const ranked: PaletteChoice[] = [];
    for (let color = 0; color < counts.length; color++) {
        const count = counts[color] ?? 0;
        if (count === 0 || color === universal) {
            continue;
        }
        ranked.push({ color, count });
    }
    ranked.sort((a, b) => {
        const aw = wide.has(a.color) ? 0 : 1;
        const bw = wide.has(b.color) ? 0 : 1;
        if (aw !== bw) {
            return aw - bw;
        }
        if (a.count !== b.count) {
            return b.count - a.count;
        }
        return a.color - b.color;
    });
    return ranked.slice(0, SUBPALETTE_COLORS);
}

/**
 * Give one region to the sprites before shaving a color off every region.
 * A shorter proposal is closer to that, and a rarer color costs fewer pixels.
 */
function spillCheapest(proposals: PaletteChoice[][]): boolean {
    let bestPlan = -1;
    let bestIndex = -1;
    let bestLength = Number.POSITIVE_INFINITY;
    let bestCount = Number.POSITIVE_INFINITY;
    let bestColor = Number.POSITIVE_INFINITY;

    for (let planIndex = 0; planIndex < proposals.length; planIndex++) {
        const proposal = proposals[planIndex];
        if (proposal === undefined || proposal.length === 0) {
            continue;
        }
        for (let entryIndex = 0; entryIndex < proposal.length; entryIndex++) {
            const entry = proposal[entryIndex];
            if (entry === undefined) {
                continue;
            }
            const better =
                proposal.length < bestLength ||
                (proposal.length === bestLength && entry.count < bestCount) ||
                (proposal.length === bestLength && entry.count === bestCount && entry.color < bestColor);
            if (!better) {
                continue;
            }
            bestPlan = planIndex;
            bestIndex = entryIndex;
            bestLength = proposal.length;
            bestCount = entry.count;
            bestColor = entry.color;
        }
    }

    if (bestPlan < 0) {
        return false;
    }
    proposals[bestPlan]?.splice(bestIndex, 1);
    return true;
}

function proposalsFit(proposals: readonly PaletteChoice[][], budget: SearchBudget): boolean {
    const extras = proposals
        .filter((proposal) => proposal.length > 0)
        .map((proposal) => proposal.map((entry) => entry.color).sort((a, b) => a - b));
    return place(uniqueExtras(extras), [], budget);
}

function spriteMask(
    indexes: Uint16Array,
    width: number,
    height: number,
    universal: number,
    proposals: readonly PaletteChoice[][]
): Uint8Array {
    const mask = new Uint8Array(indexes.length);
    const regionCols = width / ATTRIBUTE_REGION_SIZE;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            const color = indexes[index] ?? 0;
            if (color === 0xffff || color === universal) {
                continue;
            }
            const region = Math.floor(y / ATTRIBUTE_REGION_SIZE) * regionCols + Math.floor(x / ATTRIBUTE_REGION_SIZE);
            const proposal = proposals[region];
            if (proposal?.some((entry) => entry.color === color)) {
                continue;
            }
            mask[index] = 1;
        }
    }
    return mask;
}

function distinctSpriteColors(indexes: Uint16Array, sprite: Uint8Array): number[] {
    const seen = new Uint8Array(PALETTE_ENTRIES);
    const colors: number[] = [];
    for (let i = 0; i < sprite.length; i++) {
        if (sprite[i] !== 1) {
            continue;
        }
        const color = indexes[i] ?? 0;
        if (color >= PALETTE_ENTRIES || seen[color] === 1) {
            continue;
        }
        seen[color] = 1;
        colors.push(color);
    }
    colors.sort((a, b) => a - b);
    return colors;
}

function aliveAt(alive: Uint8Array, index: number | undefined): number {
    if (index === undefined) {
        return 0;
    }
    return alive[index] ?? 0;
}

function failure(code: PictureProblem['code'], message: string, overflow: number): Attempt {
    return { ok: false, failure: { problem: { code, message }, overflow } };
}

function tighter(current: Failure | undefined, next: Failure): Failure {
    if (current === undefined || next.overflow < current.overflow) {
        return next;
    }
    return current;
}

function formatColorList(colors: readonly number[]): string {
    const shown = colors.slice(0, 8).map((color) => formatPaletteIndex(color));
    if (colors.length > shown.length) {
        shown.push('…');
    }
    return shown.join(', ');
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
function assignSubpalettes(regions: readonly number[][], budget: SearchBudget): boolean {
    const candidates = [...new Set(regions.flat())];

    return candidates.some((universal) => {
        const extras = regions.map((colors) => colors.filter((color) => color !== universal).sort((a, b) => a - b));
        if (extras.some((extra) => extra.length > SUBPALETTE_COLORS)) {
            return false;
        }

        const unique = uniqueExtras(extras);
        return place(unique, [], budget);
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
function place(remaining: readonly number[][], palettes: readonly number[][], budget: SearchBudget): boolean {
    if (--budget.left < 0) {
        throw new SearchLimit();
    }
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
        if (place(rest, next, budget)) {
            return true;
        }
    }

    if (palettes.length >= SUBPALETTE_COUNT) {
        return false;
    }

    return place(rest, [...palettes, [...extra]], budget);
}

export type { PictureProblem };
export { assessPicture };
