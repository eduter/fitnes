import { type ConstructionReport, checkConstruction, displayColors } from '../nes-hardware/check.ts';
import type { RgbImage } from '../nes-hardware/png.ts';
import type { HardwareConstruction } from '../nes-hardware/rom.ts';
import type { Region } from './model.ts';

/** Exact compilation success or an unproven edit; failure is not a proof of impossibility. */
type CompileResult =
    | { ok: true; construction: HardwareConstruction; report: ConstructionReport }
    | { ok: false; reason: string; detail: string; regions: Region[] };

/** Fit exact recolored pixels to the retained layout, adding overlays when budgets permit. Never quantize. */
function compilePixels(pixels: Uint8Array, seed: HardwareConstruction): CompileResult {
    const { width, height, emphasis } = seed;
    if (
        width !== 256 ||
        height < 8 ||
        height > 240 ||
        height % 8 !== 0 ||
        pixels.length !== width * height ||
        pixels.some((v) => v > 63)
    ) {
        throw new Error('Expected a 256-wide native proof frame of six-bit NES color codes');
    }
    const image = rgbImage(pixels, emphasis);
    const unchanged = checkConstruction(seed, image);
    if (unchanged.status === 'pass') {
        return { ok: true, construction: seed, report: unchanged };
    }
    const background = Buffer.from(seed.backgroundPixels, 'base64');
    const sourceCodes = Uint8Array.from(
        background,
        (slot, p) => seed.palettes[seed.attributes[Math.floor(p / width / 8) * 32 + Math.floor((p % width) / 8)]][slot]
    );
    const colorKeys = displayColors(emphasis).map((rgb) => rgb.join(','));
    const sourceSpritePalettes = seed.spritePalettes ?? [];
    const originalSprites = seed.sprites ?? [];
    const owners = new Int16Array(pixels.length).fill(-1);
    for (const [i, sprite] of originalSprites.entries()) {
        const pattern = Buffer.from(sprite.pixels, 'base64');
        for (let sy = 0; sy < 8; sy++) {
            for (let sx = 0; sx < 8; sx++) {
                const x = sprite.x + sx;
                const y = sprite.y + sy;
                const p = y * width + x;
                if (x < width && y < height && pattern[sy * 8 + sx] !== 0 && owners[p] === -1) {
                    owners[p] = i;
                    sourceCodes[p] = sourceSpritePalettes[sprite.palette][pattern[sy * 8 + sx]];
                }
            }
        }
    }

    // Move redundant sprite inks to the background, freeing room for new recolor overlays
    for (let p = 0; p < pixels.length; p++) {
        const t = Math.floor(p / width / 8) * 32 + Math.floor((p % width) / 8);
        if (seed.palettes[seed.attributes[t]].includes(pixels[p])) {
            owners[p] = -1;
        }
    }
    const tiles = Array.from({ length: (32 * height) / 8 }, (_, t) =>
        Array.from(
            { length: 64 },
            (_, i) => (Math.floor(t / 32) * 8 + Math.floor(i / 8)) * width + (t % 32) * 8 + (i % 8)
        )
    );
    const sets = tiles.map((points) => [
        ...new Set(points.filter((p) => owners[p] < 0 && pixels[p] !== 15).map((p) => pixels[p])),
    ]);
    const groups = pack(sets);
    const paletteGroups =
        groups ?? seed.palettes.map((palette) => [...new Set(palette.slice(1).filter((v) => v !== 15))]);
    const palettes = paletteGroups.map((group) => pad(group));
    const attributes: number[] = [];
    const slots = new Uint8Array(pixels.length);
    const parts: { x: number; y: number; points: { slot: number; color: number }[] }[] = [];
    for (const [i, sprite] of originalSprites.entries()) {
        const points: { slot: number; color: number }[] = [];
        for (let sy = 0; sy < 8; sy++) {
            for (let sx = 0; sx < 8; sx++) {
                const p = (sprite.y + sy) * width + sprite.x + sx;
                if (sprite.x + sx < width && sprite.y + sy < height && owners[p] === i) {
                    points.push({ slot: sy * 8 + sx, color: pixels[p] });
                }
            }
        }
        if (points.length) {
            parts.push({ x: sprite.x, y: sprite.y, points });
        }
    }
    const troublesome: Region[] = [];
    for (let t = 0; t < tiles.length; t++) {
        const points = tiles[t].filter((p) => owners[p] < 0);
        const selected = palettes.reduce(
            (best, palette, i) => (missing(palette) < missing(palettes[best]) ? i : best),
            0
        );
        attributes.push(selected);
        const left = (t % 32) * 8;
        const top = Math.floor(t / 32) * 8;
        const overlay: { slot: number; color: number }[] = [];
        for (const p of points) {
            const slot = palettes[selected].indexOf(pixels[p]);
            if (slot >= 0) {
                slots[p] = slot;
            } else if (Math.floor(p / width) === 0) {
                troublesome.push({ left, top, width: 8, height: 8 });
            } else {
                overlay.push({
                    slot: (Math.floor(p / width) - Math.max(1, top)) * 8 + (p % width) - left,
                    color: pixels[p],
                });
            }
        }
        if (overlay.length) {
            parts.push({ x: left, y: Math.max(1, top), points: overlay });
        }
        function missing(palette: number[]): number {
            return points.reduce(
                (sum, p) => sum + (palette.includes(pixels[p]) ? 0 : Math.floor(p / width) === 0 ? 100000 : 1),
                0
            );
        }
    }
    if (troublesome.length) {
        return failure('The top edge could not be fitted without changing pixels', troublesome);
    }

    // Disjoint sprite patterns may share a position when a region needs more than three opaque inks
    const split = parts.flatMap((part) => {
        const colors = [...new Set(part.points.map((point) => point.color))];
        const result: typeof parts = [];
        for (let i = 0; i < colors.length; i += 3) {
            result.push({
                ...part,
                points: part.points.filter((point) => colors.slice(i, i + 3).includes(point.color)),
            });
        }
        return result;
    });
    const spriteGroups = pack(split.map((part) => [...new Set(part.points.map((point) => point.color))]));
    if (!spriteGroups) {
        return failure(
            'The current layout needs more shared color groups than the checker could allocate',
            changedRegions()
        );
    }
    const spritePalettes = spriteGroups.map((group) => pad(group));
    const sprites = split.map((part) => {
        const palette = spriteGroups.findIndex((group) => part.points.every((point) => group.includes(point.color)));
        const pattern = new Uint8Array(64);
        for (const point of part.points) {
            pattern[point.slot] = spritePalettes[palette].indexOf(point.color, 1);
        }
        return { x: part.x, y: part.y, palette, pixels: Buffer.from(pattern).toString('base64') };
    });
    const construction = {
        ...seed,
        palettes,
        attributes,
        backgroundPixels: Buffer.from(slots).toString('base64'),
        spriteMode: 8,
        spritePalettes,
        sprites,
    };
    const report = checkConstruction(construction, image);
    if (report.status !== 'pass') {
        return failure(report.problems.join('; '), changedRegions());
    }
    return { ok: true, construction, report };

    function changedRegions(): Region[] {
        return tiles
            .flatMap((points, t) =>
                points.some((p) => colorKeys[pixels[p]] !== colorKeys[sourceCodes[p]])
                    ? [{ left: (t % 32) * 8, top: Math.floor(t / 32) * 8, width: 8, height: 8 }]
                    : []
            )
            .slice(0, 64);
    }
}

/** Resolve retained RGB pixels to actual PPU codes under the seed's emphasis. */
function imageCodes(image: RgbImage, seed: HardwareConstruction): Uint8Array {
    const { data, width, height } = image;
    const colors = displayColors(seed.emphasis);
    const lookup = new Map<string, number>();
    for (const code of [...seed.palettes.flat(), ...(seed.spritePalettes ?? []).flat()]) {
        if (!lookup.has(colors[code].join(','))) {
            lookup.set(colors[code].join(','), code);
        }
    }
    return Uint8Array.from({ length: width * height }, (_, p) => {
        const code = lookup.get(Array.from(data.subarray(p * 3, p * 3 + 3)).join(','));
        if (code === undefined) {
            throw new Error(`Unrecognized source color at pixel ${p}`);
        }
        return code;
    });
}

/** Render exact editor color codes without resampling, color matching or smoothing. */
function rgbImage(pixels: Uint8Array, emphasis: number): RgbImage {
    const colors = displayColors(emphasis);
    const data = new Uint8Array(pixels.length * 3);
    for (let p = 0; p < pixels.length; p++) {
        data.set(colors[pixels[p]], p * 3);
    }
    return { width: 256, height: pixels.length / 256, data };
}

/** Bounded exact search for four shared three-ink groups; no solution claim on exhaustion. */
function pack(input: number[][]): number[][] | null {
    const unique = [
        ...new Map(
            input.map((set) => [[...set].sort((a, b) => a - b).join(','), [...set].sort((a, b) => a - b)])
        ).values(),
    ];
    if (unique.some((set) => set.length > 3) || new Set(unique.flat()).size > 12) {
        return null;
    }
    const sets = unique
        .filter((set, i) => !unique.some((other, j) => i !== j && set.every((color) => other.includes(color))))
        .sort((a, b) => b.length - a.length || a.join(',').localeCompare(b.join(',')));
    let visits = 0;
    const seen = new Set<string>();
    return search(0, []) ?? null;
    function search(index: number, groups: number[][]): number[][] | null {
        if (++visits > 40000) {
            return null;
        }
        if (index === sets.length) {
            return groups.length ? groups : [[]];
        }
        const key = `${index}|${groups
            .map((group) => group.join(','))
            .sort()
            .join(';')}`;
        if (seen.has(key)) {
            return null;
        }
        seen.add(key);
        const set = sets[index];
        if (groups.some((group) => set.every((code) => group.includes(code)))) {
            return search(index + 1, groups);
        }
        for (let i = 0; i < groups.length; i++) {
            const merged = [...new Set([...groups[i], ...set])].sort((a, b) => a - b);
            if (merged.length > 3) {
                continue;
            }
            const next = groups.map((group, j) => (j === i ? merged : group));
            const found = search(index + 1, next);
            if (found) {
                return found;
            }
        }
        if (groups.length < 4) {
            return search(index + 1, [...groups, set]);
        }
        return null;
    }
}

function pad(group: number[]): number[] {
    return [15, ...group, ...Array(3 - group.length).fill(15)];
}
function failure(detail: string, regions: Region[]): CompileResult {
    return {
        ok: false,
        reason: 'This edit could not be fitted to the NES layout. Try Undo, a smaller region, or another color.',
        detail,
        regions,
    };
}

export type { CompileResult };
export { compilePixels, imageCodes, rgbImage };
