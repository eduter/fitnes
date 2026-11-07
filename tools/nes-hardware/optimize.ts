import { displayColors } from './check.ts';
import { colorDistance, oklab } from './perceptual.ts';
import type { RgbImage } from './png.ts';
import type { HardwareConstruction } from './rom.ts';

const COLORS = displayColors(1);

/** A reproducible constrained palette search over one aligned native reference. */
interface PaletteSearch {
    fit: (allowed: number[]) => { construction: HardwareConstruction; image: RgbImage; objective: number };
}

/** Precompute perceptual errors; fit four background and four sprite palettes within real budgets. */
function paletteSearch(target: RgbImage, weights: Float32Array): PaletteSearch {
    const { width, height, data } = target;
    if (width !== 256 || height !== 200 || weights.length !== width * height) {
        throw new Error('Palette search expects one weighted 256×200 reference');
    }
    const lab = Array.from({ length: width * height }, (_, p) => oklab(Array.from(data.subarray(p * 3, p * 3 + 3))));
    const errors = COLORS.map((color) => {
        const ink = oklab(color);
        return Float32Array.from(lab, (pixel, p) => colorDistance(pixel, ink) * weights[p]);
    });
    const tiles = Array.from({ length: 800 }, (_, t) =>
        Array.from(
            { length: 64 },
            (_, i) => (Math.floor(t / 32) * 8 + Math.floor(i / 8)) * 256 + (t % 32) * 8 + (i % 8)
        )
    );
    const cache = new Map<string, { palette: number[]; pixels: Float32Array; costs: Float64Array }>();

    function candidate(palette: number[]): { palette: number[]; pixels: Float32Array; costs: Float64Array } {
        const key = palette.join(',');
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        const pixels = new Float32Array(width * height);
        const costs = new Float64Array(800);
        const [a, b, c, d] = palette.map((code) => errors[code]);
        for (let t = 0; t < tiles.length; t++) {
            for (const p of tiles[t]) {
                pixels[p] = Math.min(a[p], b[p], c[p], d[p]);
                costs[t] += pixels[p];
            }
        }
        const result = { palette, pixels, costs };
        cache.set(key, result);
        return result;
    }

    function allocate(
        allowed: number[],
        refinement?: { depth: number; overlays: Float32Array }
    ): ReturnType<PaletteSearch['fit']> {
        const inks = [...new Set(allowed)].filter((code) => code !== 15).sort((a, b) => a - b);
        const pool: ReturnType<typeof candidate>[] = [];
        for (let a = 0; a < inks.length; a++) {
            for (let b = a + 1; b < inks.length; b++) {
                for (let c = b + 1; c < inks.length; c++) {
                    const item = candidate([15, inks[a], inks[b], inks[c]]);
                    pool.push(
                        refinement
                            ? {
                                  ...item,
                                  costs: Float64Array.from(tiles, (pixels) =>
                                      pixels.reduce(
                                          (sum, p) => sum + Math.min(item.pixels[p], refinement.overlays[p]),
                                          0
                                      )
                                  ),
                              }
                            : item
                    );
                }
            }
        }
        const selected: number[] = [];

        // Optimize the shared groups against every tile, not each region in isolation
        for (let group = 0; group < 4; group++) {
            selected.push(bestGroup(selected));
        }
        for (let pass = 0; pass < 2; pass++) {
            for (let group = 0; group < 4; group++) {
                selected[group] = bestGroup(selected.filter((_, i) => i !== group));
            }
        }
        const background = selected.map((index) => pool[index]);
        const attributes = tiles.map((_, t) =>
            background.reduce((best, item, i) => (item.costs[t] < background[best].costs[t] ? i : best), 0)
        );
        const bgErrors = new Float32Array(width * height);
        const slots = new Uint8Array(width * height);
        const image = { width, height, data: new Uint8Array(data.length) };
        for (let t = 0; t < tiles.length; t++) {
            const palette = background[attributes[t]].palette;
            for (const p of tiles[t]) {
                const distances = palette.map((code) => errors[code][p]);
                const slot = distances.indexOf(Math.min(...distances));
                slots[p] = slot;
                bgErrors[p] = distances[slot];
                image.data.set(COLORS[palette[slot]], p * 3);
            }
        }

        // Sprite groups reuse good background/material combinations and try each new ink in existing groups
        const spriteKeys = new Set(background.map((item) => item.palette.join(',')));
        for (const seed of [
            [15, 38, 39, 55],
            [15, 0, 16, 32],
            [15, 0, 7, 56],
            [15, 0, 7, 16],
        ]) {
            for (let slot = 1; slot < 4; slot++) {
                for (const ink of inks) {
                    const palette = [...seed];
                    palette[slot] = ink;
                    if (palette.every((code) => allowed.includes(code))) {
                        spriteKeys.add([15, ...palette.slice(1).sort((a, b) => a - b)].join(','));
                    }
                }
            }
        }
        const spritePool = [...spriteKeys].map((key) => candidate(key.split(',').map(Number)));
        const gains = spritePool.map((item) =>
            Float64Array.from(tiles, (pixels, t) =>
                t < 32 ? 0 : pixels.reduce((sum, p) => sum + Math.max(0, bgErrors[p] - item.pixels[p]), 0)
            )
        );
        const spriteGroups: number[] = [];
        const bestGains = new Float64Array(800);
        for (let group = 0; group < 4; group++) {
            let best = 0;
            let benefit = -1;
            for (let i = 0; i < spritePool.length; i++) {
                const gain = gains[i].reduce((sum, value, t) => sum + Math.max(0, value - bestGains[t]), 0);
                if (gain > benefit) {
                    benefit = gain;
                    best = i;
                }
            }
            spriteGroups.push(best);
            for (let t = 0; t < 800; t++) {
                bestGains[t] = Math.max(bestGains[t], gains[best][t]);
            }
        }
        const rankedTiles = tiles
            .map((_, t) => ({ t, gain: bestGains[t] }))
            .sort((a, b) => b.gain - a.gain || a.t - b.t);
        const rowSprites = new Uint8Array(25);
        const sprites: NonNullable<HardwareConstruction['sprites']> = [];
        const overlays = new Float32Array(width * height).fill(Number.POSITIVE_INFINITY);
        for (const { t, gain } of rankedTiles) {
            const row = Math.floor(t / 32);
            if (gain < 1e-9 || sprites.length === 64 || rowSprites[row] === 8) {
                continue;
            }
            const group = spriteGroups.reduce(
                (best, item, i) => (gains[item][t] > gains[spriteGroups[best]][t] ? i : best),
                0
            );
            const palette = spritePool[spriteGroups[group]].palette;
            const pixels = new Uint8Array(64);
            for (const [i, p] of tiles[t].entries()) {
                overlays[p] = spritePool[spriteGroups[group]].pixels[p];
                const distances = palette.map((code) => errors[code][p]);
                const slot = distances.indexOf(Math.min(...distances));
                if (slot !== 0 && distances[slot] < bgErrors[p] - 1e-10) {
                    pixels[i] = slot;
                    image.data.set(COLORS[palette[slot]], p * 3);
                }
            }
            sprites.push({
                x: (t % 32) * 8,
                y: row * 8,
                palette: group,
                pixels: Buffer.from(pixels).toString('base64'),
            });
            rowSprites[row]++;
        }
        const construction: HardwareConstruction = {
            profile: 'mmc5-exattr',
            displayPalette: 'composite-direct-fbx',
            emphasis: 1,
            width,
            height,
            regionSize: 8,
            palettes: background.map((item) => item.palette),
            attributes,
            backgroundPixels: Buffer.from(slots).toString('base64'),
            spriteMode: 8,
            spritePalettes: spriteGroups.map((i) => spritePool[i].palette),
            sprites,
        };
        const objective = lab.reduce(
            (sum, pixel, p) =>
                sum + colorDistance(pixel, oklab(Array.from(image.data.subarray(p * 3, p * 3 + 3)))) * weights[p],
            0
        );
        const result = { construction, image, objective };
        if ((refinement?.depth ?? 0) < 2) {
            const next = allocate(allowed, { depth: (refinement?.depth ?? 0) + 1, overlays });
            if (next.objective < result.objective) {
                return next;
            }
        }
        return result;

        function bestGroup(others: number[]): number {
            const bestCosts = Float64Array.from({ length: 800 }, (_, t) =>
                others.reduce((best, i) => Math.min(best, pool[i].costs[t]), Number.POSITIVE_INFINITY)
            );
            let best = 0;
            let error = Number.POSITIVE_INFINITY;
            for (let i = 0; i < pool.length; i++) {
                let sum = 0;
                for (let t = 0; t < 800; t++) {
                    sum += Math.min(bestCosts[t], pool[i].costs[t]);
                }
                if (sum < error) {
                    best = i;
                    error = sum;
                }
            }
            return best;
        }
    }
    return { fit: allocate };
}

export type { PaletteSearch };
export { paletteSearch };
