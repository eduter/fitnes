import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface RgbImage {
    width: number;
    height: number;
    data: Uint8Array;
}

interface PngHelpers {
    decodePng(bytes: Uint8Array): RgbImage;
    encodePng(image: RgbImage): Uint8Array;
}

interface Point {
    x: number;
    y: number;
}

type Rgb = readonly [number, number, number];
type Accent = 'gold' | 'warm';

const OUTPUT = 'art/home';
const GRAY_STUDY = `${OUTPUT}/sources/gray-study-256.png`;
const LOGO_SOURCE = `${OUTPUT}/sources/logo-native.png`;

async function main(): Promise<void> {
    const checkerDirectory = process.argv[2];
    if (!checkerDirectory) {
        throw new Error('Pass the extracted pinned checker directory, for example /tmp/fitnes-home-checker/tools/nes');
    }
    const png = await import(pathToFileURL(resolve(checkerDirectory, 'png.ts')).href) as PngHelpers;
    const source = png.decodePng(readFileSync(GRAY_STUDY));
    if (source.width !== 256 || source.height !== 200) {
        throw new Error(`Expected a 256×200 gray study, got ${source.width}×${source.height}`);
    }

    // The two accent choices share neutral materials and differ only in warm object colors
    for (const accent of ['gold', 'warm'] as const) {
        const palettes = paletteHex(accent);
        const conversion = convert(source, palettes);
        const stem = accent === 'gold' ? 'gym' : 'gym-warm';
        writeFileSync(`${OUTPUT}/${stem}.png`, png.encodePng(conversion.image));
        writeFileSync(`${OUTPUT}/${stem}-3x.png`, png.encodePng(enlarge(conversion.image, 3)));
        const metadata = {
            source: GRAY_STUDY,
            sourceSha256: hash(readFileSync(GRAY_STUDY)),
            width: 256,
            height: 200,
            accent,
            resizing: 'The stored source is the gray study reduced with Lanczos3; this stage does not resize',
            sharpening: false,
            dithering: false,
            neutralColorThreshold: 22,
            materialRules: 'Neutral pixels stay neutral; sign and lit floor exclude the saturated accent',
            palettes,
            regionPalettes: conversion.assignments,
        };
        const manifest = accent === 'gold' ? 'conversion' : 'conversion-warm';
        writeFileSync(`${OUTPUT}/${manifest}.json`, `${JSON.stringify(metadata, null, 2)}\n`);
    }

    // Keeping the original logo geometry avoids the previous unnecessary resampling
    const logo = convertLogo(png.decodePng(readFileSync(LOGO_SOURCE)));
    mkdirSync(`${OUTPUT}/preview`, { recursive: true });
    writeFileSync(`${OUTPUT}/preview/logo.png`, png.encodePng(logo));
}

function paletteHex(accent: Accent): string[][] {
    return [
        ['000000', '747474', 'BCBCBC', 'FCFCFC'],
        ['000000', '747474', 'BCBCBC', 'FCE4A0'],
        ['000000', '747474', accent === 'gold' ? 'F0BC3C' : 'FC9838', 'FCD8A8'],
        ['000000', 'A40000', 'F0BC3C', 'FCE4A0'],
    ];
}

function convert(source: RgbImage, paletteStrings: string[][]): { image: RgbImage; assignments: number[] } {
    const { width, height, data } = source;
    const palettes = paletteStrings.map((palette) => palette.map(rgb));
    const output = new Uint8Array(data.length);
    const assignments: number[] = [];

    // Choose one of the shared art palettes for each hardware attribute region
    for (let y = 0; y < height; y += 16) {
        for (let x = 0; x < width; x += 16) {
            const costs = palettes.slice(0, 3).map((palette) => {
                let cost = 0;
                forEachPixel({ x, y }, height, (point) => {
                    const offset = (point.y * width + point.x) * 3;
                    const pixel = data.subarray(offset, offset + 3);
                    cost += Math.min(...palette.map((color) => distance(pixel, color, point)));
                });
                return cost;
            });
            const paletteIndex = costs.indexOf(Math.min(...costs));
            assignments.push(paletteIndex);
            forEachPixel({ x, y }, height, (point) => {
                const offset = (point.y * width + point.x) * 3;
                const pixel = data.subarray(offset, offset + 3);
                const color = palettes[paletteIndex].reduce((a, b) =>
                    distance(pixel, a, point) <= distance(pixel, b, point) ? a : b
                );
                output.set(color, offset);
            });
        }
    }
    return { image: { width, height, data: output }, assignments };
}

function forEachPixel(origin: Point, height: number, visit: (point: Point) => void): void {
    const { x, y } = origin;
    for (let yy = y; yy < Math.min(y + 16, height); yy++) {
        for (let xx = x; xx < x + 16; xx++) {
            visit({ x: xx, y: yy });
        }
    }
}

function distance(source: ArrayLike<number>, color: Rgb, point: Point): number {
    const { x, y } = point;
    const [r, g, b] = color;
    const neutralSource = Math.max(source[0], source[1], source[2]) - Math.min(source[0], source[1], source[2]) < 22;
    const coloredOutput = Math.max(r, g, b) - Math.min(r, g, b) > 22;
    if (neutralSource && coloredOutput) {
        return Infinity;
    }

    // These source materials are gray or softly lit, rather than saturated gold/orange
    const sign = x >= 30 && x <= 75 && y >= 54 && y <= 80;
    const floor = x >= 50 && x <= 200 && y >= 145 && y <= 190;
    const saturatedAccent = (r === 240 && g === 188 && b === 60) || (r === 252 && g === 152 && b === 56);
    if ((sign || floor) && saturatedAccent) {
        return Infinity;
    }
    return 0.3 * (source[0] - r) ** 2 + 0.59 * (source[1] - g) ** 2 + 0.11 * (source[2] - b) ** 2;
}

function convertLogo(source: RgbImage): RgbImage {
    const { width, height, data } = source;
    if (width !== 244 || height !== 114) {
        throw new Error(`Expected the native 244×114 logo, got ${width}×${height}`);
    }
    const palette = paletteHex('gold')[3].map(rgb);
    const output = new Uint8Array(256 * 128 * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 3;
            const sourcePixel = data.subarray(offset, offset + 3);
            const error = (color: Rgb) => color.reduce((sum, value, i) => sum + (sourcePixel[i] - value) ** 2, 0);
            const color = palette.reduce((a, b) => error(a) <= error(b) ? a : b);
            output.set(color, ((y + 7) * 256 + x + 6) * 3);
        }
    }
    return { width: 256, height: 128, data: output };
}

function enlarge(source: RgbImage, scale: number): RgbImage {
    const { width, height, data } = source;
    const output = new Uint8Array(width * height * scale * scale * 3);
    for (let y = 0; y < height * scale; y++) {
        for (let x = 0; x < width * scale; x++) {
            const inputOffset = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 3;
            output.set(data.subarray(inputOffset, inputOffset + 3), (y * width * scale + x) * 3);
        }
    }
    return { width: width * scale, height: height * scale, data: output };
}

function rgb(hex: string): Rgb {
    return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

function hash(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex');
}

await main();
