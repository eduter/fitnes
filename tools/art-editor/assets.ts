import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { displayColors } from '../nes-hardware/check.ts';
import { decodePng, encodePng, type RgbImage } from '../nes-hardware/png.ts';
import type { HardwareConstruction } from '../nes-hardware/rom.ts';
import { compilePixels } from './compile.ts';

/** A native repository asset with its own reference, proof frame, draft and save location. */
interface ArtworkAsset {
    id: string;
    label: string;
    width: number;
    height: number;
    seed: HardwareConstruction;
    image: Uint8Array;
    pixels: Uint8Array;
    reference: string;
    saveDirectory: string;
    imageName: string;
    constructionName: string;
    workDirectory: string;
}

/** Load editable NES PNGs without modifying or quantizing any source pixels. */
function listArtwork(root: string): ArtworkAsset[] {
    const assets: ArtworkAsset[] = [];
    const home = load(
        'home',
        'Home illustration',
        'art/home/gym.png',
        'art/home/construction.json',
        'docs/reference-home-screen-image.png'
    );
    assets.push(home);
    if (existsSync(join(root, 'art/logo/logo.png'))) {
        assets.push(load('logo', 'Logo', 'art/logo/logo.png', 'art/logo/construction.json', 'docs/fitnes-logo.png'));
    }
    // Launcher PNGs in public are generated at device sizes, not editable native NES artwork
    for (const directory of ['src', 'art']) {
        if (!existsSync(join(root, directory))) {
            continue;
        }
        for (const file of walk(directory)) {
            if (
                !file.endsWith('.png') ||
                /(^|\/)(edited|study)(\/|$)/.test(file) ||
                file.startsWith('art/logo/') ||
                file === 'art/home/gym.png'
            ) {
                continue;
            }
            try {
                const label =
                    file === 'src/styles/frame.png'
                        ? 'Field border'
                        : file === 'src/styles/frame-source.png'
                          ? 'Field border · source tile'
                          : file === 'src/components/SteelPanel/steel-panel.png'
                            ? 'Steel border'
                            : file.includes('/SteelPanel/tiles/')
                              ? `Steel tile · ${basename(file, '.png')}`
                              : file.includes('/BottomTabs/icons/')
                                ? `Tab icon · ${basename(file, '.png')}`
                                : file.replace(/^src\//, '').replace(/\.png$/, '');
                assets.push(load(file, label, file));
            } catch {
                /* References, non-NES colors and unsupported PNG formats remain source files, never silently converted */
            }
        }
    }
    return assets;

    function walk(directory: string): string[] {
        return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
            const path = `${directory}/${entry.name}`;
            return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
        });
    }
    function load(id: string, label: string, path: string, construction?: string, reference = path): ArtworkAsset {
        const bytes = readFileSync(join(root, path));
        const image = decodePng(bytes);
        if (image.width > 256 || image.height > 240) {
            throw new Error('Asset exceeds native NES frame dimensions');
        }
        const colors = displayColors(1);
        const lookup = new Map<string, number>();
        for (const code of [15, ...Array.from({ length: 64 }, (_, i) => i)]) {
            const key = colors[code].join(',');
            if (!lookup.has(key)) {
                lookup.set(key, code);
            }
        }
        const pixels = Uint8Array.from({ length: image.width * image.height }, (_, p) => {
            const code = lookup.get(Array.from(image.data.subarray(p * 3, p * 3 + 3)).join(','));
            if (code === undefined) {
                throw new Error('Source has colors outside the retained NES display interpretation');
            }
            return code;
        });
        const sourceConstruction = construction ?? `${path.slice(0, -4)}.construction.json`;
        const hasConstruction = existsSync(join(root, sourceConstruction));
        let seed = hasConstruction
            ? (JSON.parse(readFileSync(join(root, sourceConstruction), 'utf8')) as HardwareConstruction)
            : makeSeed(image, pixels);
        if (!hasConstruction) {
            const exact = compilePixels(framePixels(pixels, image.width, image.height, seed.height), seed);
            if (exact.ok) {
                seed = exact.construction;
            }
        }
        return {
            id,
            label,
            width: image.width,
            height: image.height,
            seed,
            image: bytes,
            pixels,
            reference,
            saveDirectory: dirname(path),
            imageName: basename(path),
            constructionName: basename(sourceConstruction),
            workDirectory:
                id === 'home'
                    ? 'work/art-editor'
                    : `work/art-editor/assets/${createHash('sha256').update(id).digest('hex').slice(0, 20)}`,
        };
    }
}

/** Place native pixels at the top left of a black, 256-wide NES proof frame. */
function framePixels(
    pixels: Uint8Array,
    width: number,
    height: number,
    frameHeight = Math.ceil(height / 8) * 8
): Uint8Array {
    if (
        pixels.length !== width * height ||
        width < 1 ||
        width > 256 ||
        height < 1 ||
        frameHeight < height ||
        frameHeight > 240
    ) {
        throw new Error('Invalid native asset dimensions');
    }
    const frame = new Uint8Array(256 * frameHeight).fill(15);
    for (let y = 0; y < height; y++) {
        frame.set(pixels.subarray(y * width, (y + 1) * width), y * 256);
    }
    return frame;
}

/** Render a native PNG using the current hardware display model. */
function assetPng(pixels: Uint8Array, width: number, height: number, emphasis: number): Uint8Array {
    const colors = displayColors(emphasis);
    const data = new Uint8Array(pixels.length * 3);
    for (let p = 0; p < pixels.length; p++) {
        data.set(colors[pixels[p]], p * 3);
    }
    return encodePng({ width, height, data });
}

function makeSeed(image: RgbImage, pixels: Uint8Array): HardwareConstruction {
    const height = Math.ceil(image.height / 8) * 8;
    const frame = framePixels(pixels, image.width, image.height, height);
    const groups = new Map<string, { palette: number[]; count: number }>();
    for (let top = 0; top < height; top += 8) {
        for (let left = 0; left < 256; left += 8) {
            const counts = new Map<number, number>();
            for (let y = top; y < top + 8; y++) {
                for (let x = left; x < left + 8; x++) {
                    const code = frame[y * 256 + x];
                    if (code !== 15) {
                        counts.set(code, (counts.get(code) ?? 0) + 1);
                    }
                }
            }
            const inks = [...counts]
                .sort((a, b) => b[1] - a[1] || a[0] - b[0])
                .slice(0, 3)
                .map(([code]) => code)
                .sort((a, b) => a - b);
            const palette = [15, ...inks, ...Array(3 - inks.length).fill(15)];
            const key = palette.join(',');
            const previous = groups.get(key);
            groups.set(key, { palette, count: (previous?.count ?? 0) + (inks.length ? 1 : 0) });
        }
    }
    const palettes = [...groups.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((group) => group.palette);
    return {
        profile: 'mmc5-exattr',
        displayPalette: 'composite-direct-fbx',
        emphasis: 1,
        width: 256,
        height,
        regionSize: 8,
        palettes,
        attributes: Array((32 * height) / 8).fill(0),
        backgroundPixels: Buffer.from(new Uint8Array(256 * height)).toString('base64'),
        spritePalettes: [],
        sprites: [],
        spriteMode: 8,
    };
}

export type { ArtworkAsset };
export { assetPng, framePixels, listArtwork };
