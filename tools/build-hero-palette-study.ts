import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { paletteSearch } from './nes-hardware/optimize.ts';
import { colorDistance, oklab, perceptualScore } from './nes-hardware/perceptual.ts';
import { decodePng, encodePng, type RgbImage } from './nes-hardware/png.ts';

const OUT = 'art/home/study';
const COLORS = displayColors(1);
const BASE = [15, 0, 7, 56, 16, 38, 45, 39, 55];

/** Rank useful extra hardware inks against the original hero and prove full-scene candidates. */
function main(): void {
    mkdirSync(OUT, { recursive: true });
    for (const file of readdirSync(OUT).filter((name) => /^gym-richer-\d+\.(png|json)$/.test(name))) {
        unlinkSync(`${OUT}/${file}`);
    }
    const reference = decodePng(readFileSync('docs/reference-home-screen-image.png'));
    const native = areaReference(reference);
    const current = decodePng(readFileSync('art/home/gym.png'));
    const { target, weights, whitePixels, shadePixels } = materialTarget(native, current);
    const search = paletteSearch(target, weights);
    const allowed = [...BASE, 32];
    const rounds: object[] = [];
    const candidates: Record<string, object> = {};
    const lab = Array.from({ length: 51200 }, (_, p) => oklab(Array.from(target.data.subarray(p * 3, p * 3 + 3))));
    const unique = COLORS.map((color, code) => ({ color, code })).filter(
        (item, i, all) =>
            all.findIndex((other) => other.color.join(',') === item.color.join(',')) === i &&
            item.color.some((c) => c > 0)
    );
    const existingOnly = search.fit(BASE);
    const existingProof = save('gym-existing-refit', existingOnly);
    let previous = search.fit(allowed);
    const referenceProof = save('gym-reference-fit', previous);

    // Use a global nearest-ink bound to shortlist candidates, then measure their real constrained fit
    for (let step = 1; step <= 4; step++) {
        const nearest = lab.map((pixel) =>
            Math.min(...allowed.map((code) => colorDistance(pixel, oklab(COLORS[code]))))
        );
        const shortlist = unique
            .filter(({ code }) => !allowed.includes(code))
            .map(({ code, color }) => {
                const ink = oklab(color);
                const potential = lab.reduce(
                    (sum, pixel, p) => sum + Math.max(0, nearest[p] - colorDistance(pixel, ink)),
                    0
                );
                return { code, potential };
            })
            .sort((a, b) => b.potential - a.potential || a.code - b.code)
            .slice(0, 6);
        const measured = shortlist
            .map(({ code, potential }) => {
                const fit = search.fit([...allowed, code]);
                const score = perceptualScore(native, fit.image);
                return { code, potential, fit, score, addedInkPixels: countInk(fit.image, code) };
            })
            .sort((a, b) => a.score.meanOklabDistance - b.score.meanOklabDistance || a.code - b.code);
        const best = measured.find((item) => item.addedInkPixels > 0);
        const before = perceptualScore(native, previous.image);
        if (!best || best.score.meanOklabDistance >= before.meanOklabDistance) {
            rounds.push({
                step,
                stopped: 'No shortlisted visible extra ink improves the aligned reference score',
                tested: measured.map(({ code, potential, score, addedInkPixels }) => ({
                    code,
                    potential,
                    addedInkPixels,
                    ...score,
                })),
            });
            break;
        }
        allowed.push(best.code);
        const name = `gym-richer-${step}`;
        const proof = save(name, best.fit);
        const exactWhite = whitePixels.filter((p) =>
            [0, 1, 2].every((c) => best.fit.image.data[p * 3 + c] === COLORS[32][c])
        ).length;
        candidates[name] = {
            addedCodes: allowed.filter((code) => !BASE.includes(code)),
            ...best.score,
            hardware: proof,
            exactOffWhitePixels: exactWhite,
            requestedOffWhitePixels: whitePixels.length,
            inkUsage: allowed
                .map((code) => ({ code, hex: hex(code), pixels: countInk(best.fit.image, code) }))
                .filter((item) => item.pixels > 0),
        };
        rounds.push({
            step,
            selectedCode: best.code,
            hex: hex(best.code),
            meanDistanceReduction: before.meanOklabDistance - best.score.meanOklabDistance,
            percentReduction:
                (100 * (before.meanOklabDistance - best.score.meanOklabDistance)) / before.meanOklabDistance,
            tested: measured.map(({ code, potential, score, addedInkPixels }) => ({
                code,
                hex: hex(code),
                potential,
                addedInkPixels,
                ...score,
            })),
        });
        previous = best.fit;
        console.log(
            `Added $${best.code.toString(16).padStart(2, '0')} ${hex(best.code)}; Oklab ${best.score.meanOklabDistance.toFixed(6)}; ${proof.visibleColors} visible colors`
        );
    }
    writeFileSync(`${OUT}/hero-source-native.png`, encodePng(native));
    writeFileSync(`${OUT}/hero-material-target.png`, encodePng(target));
    const crispTarget = materialTarget(native, current, true);
    const crisp = paletteSearch(crispTarget.target, crispTarget.weights).fit(allowed);
    const crispProof = save('gym-crisp-alternative', crisp);
    writeFileSync(`${OUT}/hero-crisp-target.png`, encodePng(crispTarget.target));
    const report = {
        method: 'Original high-resolution reference downsampled by exact area averaging in sRGB to 256x200, aligned to the full composition. All metrics compare against that unmodified native reference. Primary conversion target follows the reference except explicit shared off-white cloth/shoe highlights and warm folds. The crisp alternative additionally anchors luminance below 32/255 to black and hazard highlights to warm yellow. Neither adjustment changes the scoring reference. Added colors shortlisted by an unconstrained nearest-ink bound, then six candidates per round fitted and ranked by actual mean Oklab distance under hardware budgets. Greedy alternating palette/tile/sprite search is not a proof of a global optimum.',
        current: perceptualScore(native, current),
        reference: {
            width: reference.width,
            height: reference.height,
            originalSha256: createHash('sha256')
                .update(readFileSync('docs/reference-home-screen-image.png'))
                .digest('hex'),
            nativeSha256: createHash('sha256').update(encodePng(native)).digest('hex'),
        },
        existingPaletteRefit: { ...perceptualScore(native, existingOnly.image), hardware: existingProof },
        referenceFit: {
            ...perceptualScore(native, decodePng(readFileSync(`${OUT}/gym-reference-fit.png`))),
            hardware: referenceProof,
        },
        candidates,
        crispAlternative: { ...perceptualScore(native, crisp.image), hardware: crispProof },
        rounds,
        materialMasks: { offWhiteCode: 32, offWhiteHex: hex(32), shadeCode: 16, whitePixels, shadePixels },
    };
    writeFileSync(`${OUT}/hero-report.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ current: report.current, referenceFit: report.referenceFit, candidates }, null, 2));
}

function areaReference(source: RgbImage): RgbImage {
    const { width, height, data } = source;
    const image = { width: 256, height: 200, data: new Uint8Array(51200 * 3) };
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 256; x++) {
            const left = (x * width) / 256;
            const right = ((x + 1) * width) / 256;
            const top = (y * height) / 200;
            const bottom = ((y + 1) * height) / 200;
            const sums = [0, 0, 0];
            for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy++) {
                for (let sx = Math.floor(left); sx < Math.ceil(right); sx++) {
                    const area =
                        (Math.min(right, sx + 1) - Math.max(left, sx)) * (Math.min(bottom, sy + 1) - Math.max(top, sy));
                    for (let c = 0; c < 3; c++) {
                        sums[c] += data[(sy * width + sx) * 3 + c] * area;
                    }
                }
            }
            image.data.set(
                sums.map((sum) => Math.round(sum / ((right - left) * (bottom - top)))),
                (y * 256 + x) * 3
            );
        }
    }
    return image;
}

function materialTarget(
    native: RgbImage,
    current: RgbImage,
    crisp = false
): { target: RgbImage; weights: Float32Array; whitePixels: number[]; shadePixels: number[] } {
    const target = { ...native, data: native.data.slice() };
    const weights = new Float32Array(51200).fill(1);
    const whitePixels: number[] = [];
    const shadePixels: number[] = [];
    const polygons = [
        [
            [37, 88],
            [42, 88],
            [44, 90],
            [44, 102],
            [42, 105],
            [38, 104],
        ],
        [
            [29, 162],
            [37, 161],
            [42, 164],
            [46, 168],
            [46, 184],
            [42, 186],
            [33, 185],
            [32, 169],
            [27, 167],
        ],
        [
            [111, 141],
            [116, 141],
            [118, 149],
            [115, 152],
            [105, 152],
            [105, 149],
            [109, 146],
        ],
        [
            [138, 141],
            [144, 141],
            [144, 146],
            [148, 149],
            [148, 152],
            [138, 152],
            [135, 148],
        ],
    ];
    const brighten = new Set([16, 56, 38, 39, 55].map((code) => COLORS[code].join(',')));
    for (let p = 0; p < 51200; p++) {
        const value = Array.from(native.data.subarray(p * 3, p * 3 + 3));
        if (crisp && value[0] * 0.2126 + value[1] * 0.7152 + value[2] * 0.0722 < 32) {
            target.data.set([0, 0, 0], p * 3);
            weights[p] = 4;
        }
        const x = p % 256;
        const y = Math.floor(p / 256);
        const originalInk = Array.from(current.data.subarray(p * 3, p * 3 + 3)).join(',');
        const hazard = y >= 192 || (x < 11 && y >= 76 && y < 134) || (x >= 221 && y >= 117 && y < 128);
        if (crisp && hazard && originalInk === COLORS[56].join(',')) {
            target.data.set(COLORS[55], p * 3);
            weights[p] = 4;
        }
        if (!polygons.some((polygon) => inside(x + 0.5, y + 0.5, polygon))) {
            continue;
        }
        const rgb = Array.from(current.data.subarray(p * 3, p * 3 + 3));
        if (brighten.has(rgb.join(','))) {
            target.data.set(COLORS[32], p * 3);
            weights[p] = 100;
            whitePixels.push(p);
        } else if (rgb.join(',') === COLORS[0].join(',')) {
            target.data.set(COLORS[16], p * 3);
            weights[p] = 4;
            shadePixels.push(p);
        } else {
            target.data.set(rgb, p * 3);
            weights[p] = 4;
        }
    }
    return { target, weights, whitePixels, shadePixels };
}

function inside(x: number, y: number, polygon: number[][]): boolean {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            result = !result;
        }
    }
    return result;
}

function hex(code: number): string {
    return `#${COLORS[code].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function countInk(image: RgbImage, code: number): number {
    let count = 0;
    for (let p = 0; p < image.width * image.height; p++) {
        if ([0, 1, 2].every((c) => image.data[p * 3 + c] === COLORS[code][c])) {
            count++;
        }
    }
    return count;
}

function save(
    name: string,
    result: ReturnType<ReturnType<typeof paletteSearch>['fit']>
): ReturnType<typeof checkConstruction> {
    const { construction, image } = result;
    const proof = checkConstruction(construction, image);
    if (proof.status !== 'pass') {
        throw new Error(`${name}: ${proof.problems.join('; ')}`);
    }
    writeFileSync(`${OUT}/${name}.png`, encodePng(image));
    writeFileSync(`${OUT}/${name}.json`, `${JSON.stringify(construction, null, 2)}\n`);
    return proof;
}

main();
