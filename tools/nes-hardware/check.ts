import { readFileSync } from 'node:fs';

const DISPLAY = JSON.parse(
    readFileSync(new URL('./palettes/composite-direct-fbx.json', import.meta.url), 'utf8')
) as DisplayModel;

/** Verify an explicit NES layer construction against every delivered RGB pixel. */
function checkConstruction(value: unknown, image: RgbImage): ConstructionReport {
    const { width, height, data } = image;
    if (
        width !== 256 ||
        !Number.isInteger(height) ||
        height < 1 ||
        height > 240 ||
        data.length !== width * height * 3
    ) {
        return failure('Expected one native 256-pixel-wide NES frame or crop, height 1–240, with exact RGB bytes');
    }
    if (!record(value)) {
        return failure('Construction must be an object');
    }
    if (value.profile !== 'stock' && value.profile !== 'mmc5-exattr') {
        return failure('Supported hardware profiles are stock and mmc5-exattr');
    }
    if (value.displayPalette !== DISPLAY.id) {
        return failure(
            'Choose the documented composite-direct-fbx display model; arbitrary RGB tables are not accepted'
        );
    }
    if (!integer(value.emphasis, 0, 7)) {
        return failure('A single whole-frame PPUMASK emphasis state 0–7 is required');
    }
    if (value.width !== width || value.height !== height) {
        return failure('Construction dimensions differ from the PNG');
    }
    const region = value.profile === 'stock' ? 16 : 8;
    if (value.regionSize !== region) {
        return failure(`${value.profile} requires ${region}×${region} background attribute regions`);
    }
    if (!palettes(value.palettes, 1, 4)) {
        return failure('Background must contain 1–4 palettes of four legal six-bit PPU codes');
    }
    const backgroundPalettes = value.palettes;
    const universal = backgroundPalettes[0][0];
    if (!backgroundPalettes.every((palette) => palette[0] === universal)) {
        return failure('All background palettes must share entry zero');
    }
    const columns = width / region;
    const regionCount = columns * Math.ceil(height / region);
    if (
        !Array.isArray(value.attributes) ||
        value.attributes.length !== regionCount ||
        !value.attributes.every((attribute) => integer(attribute, 0, backgroundPalettes.length - 1))
    ) {
        return failure(`Expected ${regionCount} valid shared-palette selections`);
    }
    const slots = decodedSlots(value.backgroundPixels, width * height);
    if (!slots) {
        return failure('Background needs exactly one 2-bit palette slot per pixel');
    }

    // Reconstruct the background independently of the converter's palette search
    const expected = new Uint8Array(data.length);
    const colors = displayColors(value.emphasis);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = y * width + x;
            const attribute = Math.floor(y / region) * columns + Math.floor(x / region);
            const palette = backgroundPalettes[value.attributes[attribute]];
            expected.set(colors[palette[slots[pixel]]], pixel * 3);
        }
    }

    const spritePalettes = value.spritePalettes ?? [];
    const sprites = value.sprites ?? [];
    if (!palettes(spritePalettes, 0, 4) || !spritePalettes.every((palette) => palette[0] === universal)) {
        return failure(
            'Sprites need at most four palettes, with transparent entry zero sharing the backdrop RAM value'
        );
    }
    if (!Array.isArray(sprites) || sprites.length > 64) {
        return failure('A frame may contain at most 64 sprites');
    }
    if (sprites.length > 0 && value.spriteMode !== 8) {
        return failure('This explicit construction profile supports 8×8 sprites');
    }
    const scanlines = new Uint8Array(240);
    const occupied = new Uint8Array(width * height);
    for (const sprite of sprites) {
        if (
            !record(sprite) ||
            !integer(sprite.x, 0, 255) ||
            !integer(sprite.y, 1, 239) ||
            !integer(sprite.palette, 0, spritePalettes.length - 1)
        ) {
            return failure('Invalid sprite position or palette selection');
        }
        const pattern = decodedSlots(sprite.pixels, 64);
        if (!pattern) {
            return failure('Each sprite must have an exact 8×8 two-bit pattern');
        }
        for (let y = sprite.y; y < Math.min(sprite.y + 8, 240); y++) {
            scanlines[y] += 1;
            if (scanlines[y] > 8) {
                return failure(`Sprite scanline budget exceeded at y=${y}; transparent rows also consume slots`);
            }
        }
        for (let sy = 0; sy < 8; sy++) {
            for (let sx = 0; sx < 8; sx++) {
                const x: number = sprite.x + sx;
                const y: number = sprite.y + sy;
                const slot = pattern[sy * 8 + sx];
                if (slot === 0 || x >= width || y >= height) {
                    continue;
                }
                const pixel = y * width + x;
                if (occupied[pixel]) {
                    continue;
                }
                occupied[pixel] = 1;
                expected.set(colors[spritePalettes[sprite.palette][slot]], pixel * 3);
            }
        }
    }

    const visible = new Set<string>();
    for (let pixel = 0; pixel < width * height; pixel++) {
        const offset = pixel * 3;
        if (
            expected[offset] !== data[offset] ||
            expected[offset + 1] !== data[offset + 1] ||
            expected[offset + 2] !== data[offset + 2]
        ) {
            return failure(
                `Pixel (${pixel % width},${Math.floor(pixel / width)}) differs from the declared PPU construction`
            );
        }
        visible.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    }
    return {
        status: 'pass',
        profile: value.profile,
        displayPalette: DISPLAY.id,
        emphasis: value.emphasis,
        attributeSize: region,
        visibleColors: visible.size,
        sprites: sprites.length,
        maxSpritesPerScanline: Math.max(...scanlines),
        problems: [],
    };
}

/** Exact native RGB bytes; no resizing, antialiasing or quantization occurs in the verifier. */
interface RgbImage {
    width: number;
    height: number;
    data: Uint8Array;
}

/** A proven construction or a definite mismatch with the supplied construction. */
interface ConstructionReport {
    status: 'pass' | 'fail';
    profile?: string;
    displayPalette?: string;
    emphasis?: number;
    attributeSize?: number;
    visibleColors?: number;
    sprites?: number;
    maxSpritesPerScanline?: number;
    problems: string[];
}

/** Resolve six-bit PPU codes under one documented display model and whole-frame emphasis state. */
function displayColors(emphasis: number): number[][] {
    if (!integer(emphasis, 0, 7)) {
        throw new Error(`Invalid PPUMASK emphasis state ${emphasis}`);
    }
    const multiplier = DISPLAY.emphasisMultipliers[emphasis];
    return DISPLAY.colors.map((hex) =>
        [0, 2, 4].map((offset, channel) =>
            Math.min(255, Math.floor(Number.parseInt(hex.slice(offset, offset + 2), 16) * multiplier[channel]))
        )
    );
}

interface DisplayModel {
    id: string;
    colors: string[];
    emphasisMultipliers: number[][];
}

function palettes(value: unknown, min: number, max: number): value is number[][] {
    return (
        Array.isArray(value) &&
        value.length >= min &&
        value.length <= max &&
        value.every(
            (palette) =>
                Array.isArray(palette) && palette.length === 4 && palette.every((color) => integer(color, 0, 63))
        )
    );
}

function decodedSlots(value: unknown, size: number): Uint8Array | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const bytes = Buffer.from(value, 'base64');
    if (bytes.toString('base64') !== value || bytes.length !== size || !bytes.every((slot) => slot < 4)) {
        return undefined;
    }
    return bytes;
}

function integer(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failure(message: string): ConstructionReport {
    return { status: 'fail', problems: [message] };
}

export { checkConstruction, displayColors };
export type { RgbImage, ConstructionReport };
