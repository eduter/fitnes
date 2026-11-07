import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { colorDistance, oklab, perceptualScore } from './nes-hardware/perceptual.ts';
import { decodePng, encodePng, type RgbImage } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

const OUT = 'art/home/study';
const COLORS = displayColors(1);
const LAB = COLORS.map(oklab);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Rebuild conservative home-art candidates and reproducible perceptual comparisons. */
function main(): void {
    mkdirSync(OUT, { recursive: true });
    const original = decodePng(readFileSync('art/home/gym.png'));
    const hero = heroStudy(original, [15, 17, 33, 49]);
    const warmHero = heroStudy(original, [15, 33, 49, 32]);
    const source = logoSource();
    const originalInks = [
        ...new Set(JSON.parse(readFileSync('art/home/construction.json', 'utf8')).palettes.flat()),
    ] as number[];
    const baseline = quantizeLogo(source, [originalInks], false);
    const palettes = [
        [15, 22, 39, 56],
        [15, 22, 56, 32],
        [15, 6, 22, 39],
        [15, 38, 39, 56],
    ];
    const nearest = quantizeLogo(source, palettes, false);
    const dithered = quantizeLogo(source, palettes, true);
    const reports = {
        hero: save('gym-linen', hero.construction, hero.image),
        warmHero: save('gym-warm-linen', warmHero.construction, warmHero.image),
        logoNearest: save('logo-nearest', nearest.construction, nearest.image),
        logoDithered: save('logo-dithered', dithered.construction, dithered.image),
    };
    writeFileSync(`${OUT}/logo-source.png`, encodePng(source));
    writeFileSync(`${OUT}/logo-nine-ink-baseline.png`, encodePng(baseline.image));
    const metrics = {
        explanation:
            'Aligned native pixels; Oklab distance lower is better, 8x8 luminance SSIM higher is better. Baseline is a new nine-ink approximation, not a recovered prior logo. Dithering is judged visually too.',
        logoNineInkBaseline: perceptualScore(source, baseline.image),
        logoNearest: perceptualScore(source, nearest.image),
        logoDithered: perceptualScore(source, dithered.image),
        heroAgainstRetainedArtwork: perceptualScore(original, hero.image),
        heroChangedPixels: original.data.reduce(
            (sum, _, i) =>
                i % 3 === 0 && [0, 1, 2].some((c) => original.data[i + c] !== hero.image.data[i + c]) ? sum + 1 : sum,
            0
        ),
        hardware: reports,
    };
    writeFileSync(`${OUT}/report.json`, `${JSON.stringify(metrics, null, 2)}\n`);
    console.log(JSON.stringify(metrics, null, 2));
}

function heroStudy(
    original: RgbImage,
    clothPalette: number[]
): { construction: HardwareConstruction; image: RgbImage } {
    const construction = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const image = { ...original, data: original.data.slice() };
    const palettes = construction.spritePalettes ?? [];
    construction.spritePalettes = [...palettes, clothPalette];
    const sprites = construction.sprites ?? [];
    construction.sprites = sprites;
    const oldCodes = new Map([0, 16, 56].map((code, i) => [COLORS[code].join(','), i + 1]));

    // Only cloth interiors receive new inks; keep all existing outlines and scene geometry
    for (const [left, top] of [
        [37, 90],
        [37, 98],
        [32, 168],
        [40, 168],
        [32, 176],
        [40, 176],
    ]) {
        const pixels = new Uint8Array(64);
        for (let y = top; y < top + 8; y++) {
            for (let x = left; x < left + 8; x++) {
                const isCloth = top < 110 ? x >= 38 && x <= 43 && y <= 103 : x >= 33 && x <= 44 && y <= 182;
                if (!isCloth) {
                    continue;
                }
                const p = (y * 256 + x) * 3;
                const slot = oldCodes.get(Array.from(original.data.subarray(p, p + 3)).join(','));
                if (slot === undefined) {
                    continue;
                }
                pixels[(y - top) * 8 + x - left] = slot;
                image.data.set(COLORS[construction.spritePalettes[palettes.length][slot]], p);
            }
        }
        sprites.push({ x: left, y: top, palette: palettes.length, pixels: Buffer.from(pixels).toString('base64') });
    }
    return { construction, image };
}

function logoSource(): RgbImage {
    const reference = decodePng(readFileSync('docs/fitnes-logo.png'));
    const image = { width: 256, height: 120, data: new Uint8Array(256 * 120 * 3) };
    for (let y = 0; y < reference.height; y++) {
        image.data.set(
            reference.data.subarray(y * reference.width * 3, (y + 1) * reference.width * 3),
            ((y + 3) * 256 + 6) * 3
        );
    }
    return image;
}

function quantizeLogo(
    source: RgbImage,
    palettes: number[][],
    dither: boolean
): { construction: HardwareConstruction; image: RgbImage } {
    const { width, height } = source;
    const attributes: number[] = [];
    const slots = new Uint8Array(width * height);
    const image = { width, height, data: new Uint8Array(source.data.length) };
    for (let top = 0; top < height; top += 8) {
        for (let left = 0; left < width; left += 8) {
            const candidates = palettes.map((palette) => {
                let error = 0;
                const tile: number[] = [];
                for (let y = top; y < top + 8; y++) {
                    for (let x = left; x < left + 8; x++) {
                        const p = (y * width + x) * 3;
                        const rgb = Array.from(source.data.subarray(p, p + 3));
                        const lab = oklab(rgb);
                        const distances = palette.map((code) => colorDistance(lab, LAB[code]));
                        let slot = distances.indexOf(Math.min(...distances));
                        error += distances[slot];
                        if (dither && Math.max(...rgb) > 60) {
                            slot = ditherSlot(lab, palette, slot, x, y);
                        }
                        tile.push(slot);
                    }
                }
                return { error, tile };
            });
            const selected = candidates.reduce((best, c, i) => (c.error < candidates[best].error ? i : best), 0);
            attributes.push(selected);
            for (let dy = 0; dy < 8; dy++) {
                for (let dx = 0; dx < 8; dx++) {
                    const p = (top + dy) * width + left + dx;
                    slots[p] = candidates[selected].tile[dy * 8 + dx];
                    image.data.set(COLORS[palettes[selected][slots[p]]], p * 3);
                }
            }
        }
    }
    return {
        image,
        construction: {
            profile: 'mmc5-exattr',
            displayPalette: 'composite-direct-fbx',
            emphasis: 1,
            width,
            height,
            regionSize: 8,
            palettes,
            attributes,
            backgroundPixels: Buffer.from(slots).toString('base64'),
        },
    };
}

function ditherSlot(lab: number[], palette: number[], nearest: number, x: number, y: number): number {
    let best = colorDistance(lab, LAB[palette[nearest]]);
    let result = nearest;
    const threshold = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;

    // Mix only two opaque inks; a dark letter edge must never become a checkerboard hole
    for (let a = 1; a < palette.length; a++) {
        for (let b = a + 1; b < palette.length; b++) {
            const from = LAB[palette[a]];
            const to = LAB[palette[b]];
            const vector = to.map((v, c) => v - from[c]);
            const length = vector.reduce((sum, v) => sum + v * v, 0);
            if (length === 0 || length > 0.04) {
                continue;
            }
            const mix = Math.max(0, Math.min(1, vector.reduce((s, v, c) => s + v * (lab[c] - from[c]), 0) / length));
            const error = colorDistance(
                lab,
                from.map((v, c) => v + mix * vector[c])
            );
            if (error < best) {
                best = error;
                result = mix > threshold ? b : a;
            }
        }
    }
    return result;
}

function save(name: string, construction: HardwareConstruction, image: RgbImage): ReturnType<typeof checkConstruction> {
    const report = checkConstruction(construction, image);
    if (report.status !== 'pass') {
        throw new Error(`${name}: ${report.problems.join('; ')}`);
    }
    writeFileSync(`${OUT}/${name}.png`, encodePng(image));
    writeFileSync(`${OUT}/${name}.json`, `${JSON.stringify(construction, null, 2)}\n`);
    return report;
}

main();
