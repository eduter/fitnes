import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const assets = JSON.parse(readFileSync(`${root}art/steel-sample/assets.json`, 'utf8')) as Assets;
const master = JSON.parse(readFileSync(`${root}art/steel-sample/master-palette.json`, 'utf8')).colors as string[];
const palettes = [
    [0x0f, 0x00, 0x10, 0x20],
    [0x0f, 0x17, 0x28, 0x38],
];
const spritePalettes = [
    [0x0f, 0x0f, 0x37, 0x17],
    [0x0f, 0x0f, 0x37, 0x20],
    [0x0f, 0x0f, 0x0c, 0x10],
];
const width = 256;
const height = 240;

/** Draw the standalone study and preserve its actual NES layer construction. */
function renderSample(): Construction {
    const background = new Uint8Array(width * height);
    const attributes = Array.from({ length: 15 }, (_, y) =>
        Array.from({ length: 16 }, (_, x) => (y >= 1 && y < 4 && x >= 1 && x < 8 ? 1 : 0))
    );
    const put = (x: number, y: number, color: number) => {
        background[y * width + x] = color;
    };
    const rect = (x: number, y: number, w: number, h: number, color: number) => {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                put(x + dx, y + dy, color);
            }
        }
    };
    const art = (rows: string[], x: number, y: number) => {
        rows.forEach((row, dy) => {
            [...row].forEach((color, dx) => {
                put(x + dx, y + dy, Number(color));
            });
        });
    };
    const text = (label: string, x: number, y: number, color: number) => {
        [...label].forEach((glyph, i) => {
            const rows = assets.glyphs[glyph];
            if (!rows) {
                throw new Error(`Missing sample glyph: ${glyph}`);
            }
            rows.forEach((row, dy) => {
                [...row].forEach((v, dx) => {
                    if (v !== '0') {
                        put(x + i * 8 + dx, y + dy, color);
                    }
                });
            });
        });
    };
    const bolt = (x: number, y: number) => art(assets.rivet, x, y);
    const frame = (x: number, y: number, w: number, h: number) => {
        // Stepped silhouettes and asymmetric glints make thickness without gradients
        rect(x + 4, y, w - 8, h, 1);
        rect(x, y + 4, w, h - 8, 1);
        rect(x + 4, y + 1, w - 8, 1, 3);
        rect(x + 1, y + 4, 1, h - 8, 2);
        rect(x + 5, y + 3, w - 10, 1, 2);
        rect(x + 3, y + 5, 1, h - 10, 2);
        rect(x + 6, y + 6, w - 12, h - 12, 0);
        rect(x + w - 4, y + 6, 2, h - 12, 0);
        rect(x + 6, y + h - 4, w - 12, 2, 0);
        for (const [cx, cy, sx, sy] of [
            [x, y, 1, 1],
            [x + w - 1, y, -1, 1],
            [x, y + h - 1, 1, -1],
            [x + w - 1, y + h - 1, -1, -1],
        ]) {
            for (let i = 0; i < 9; i++) {
                put(cx + sx * (3 + i), cy + sy * (11 - i), 0);
                put(cx + sx * (3 + i), cy + sy * (10 - i), 2);
            }
        }
        for (const bx of [x + 5, x + w - 9]) {
            for (const by of [y + 5, y + h - 9]) {
                bolt(bx, by);
            }
        }
        for (let i = 18; i < h - 18; i += 17) {
            put(x + 4, y + i, 0);
            put(x + w - 6, y + i + 2, 2);
        }
        for (let i = 24; i < w - 24; i += 32) {
            rect(x + i, y + 4, 8, 1, 0);
            rect(x + i, y + h - 6, 5, 1, 2);
        }
    };

    // Keep the warm wordmark inside whole attribute regions, clear of the steel
    frame(8, 8, 240, 64);
    art(assets.logo, 16, 16);
    text('STEEL', 160, 25, 2);
    text('GYM', 160, 41, 3);
    rect(148, 20, 1, 40, 1);
    rect(150, 20, 1, 40, 2);
    for (let y = 24; y < 60; y += 8) {
        rect(232, y, 4, 2, 1);
        rect(232, y, 2, 1, 2);
    }

    frame(8, 80, 240, 152);
    text('TRAINING ROOM', 24, 88, 2);

    // Quiet rubber floor tiles leave equipment silhouettes and the athlete clear
    rect(16, 96, 224, 80, 0);
    for (let y = 112; y < 176; y += 16) {
        for (let x = 16; x < 240; x += 16) {
            put(x + 2, y + 2, 1);
            put(x + 10, y + 10, 1);
            if ((x / 16 + y / 16) % 2 === 0) {
                put(x + 8, y + 15, 1);
            }
        }
    }
    rect(16, 96, 224, 3, 1);
    rect(16, 96, 224, 1, 3);
    for (let x = 24; x < 240; x += 32) {
        rect(x, 99, 1, 12, 1);
        bolt(x + 12, 101);
    }
    rect(100, 100, 40, 7, 1);
    rect(101, 101, 38, 5, 0);
    for (let x = 104; x < 138; x += 4) {
        rect(x, 101, 1, 5, 2);
    }
    rect(16, 110, 224, 2, 1);
    rect(16, 110, 224, 1, 2);

    // A bounded lifting platform adds floor structure while preserving a quiet center
    rect(96, 123, 64, 45, 1);
    rect(97, 124, 62, 43, 0);
    for (const x of [99, 155]) {
        rect(x, 126, 2, 8, 2);
        rect(x, 157, 2, 8, 1);
    }
    for (const x of [104, 144]) {
        rect(x, 125, 9, 1, 1);
        rect(x, 165, 9, 1, 1);
    }

    // Rack, bar and bench are viewed from above; feet and cast shadows point down
    rect(28, 120, 48, 40, 1);
    rect(30, 122, 44, 36, 0);
    for (const x of [28, 72]) {
        rect(x, 120, 4, 40, 2);
        rect(x, 120, 1, 38, 3);
        rect(x - 3, 157, 10, 3, 1);
    }
    rect(24, 128, 60, 3, 2);
    rect(24, 128, 60, 1, 3);
    for (const x of [32, 66]) {
        rect(x, 121, 7, 16, 0);
        rect(x + 1, 122, 5, 14, 1);
        rect(x + 1, 122, 1, 13, 3);
        rect(x + 3, 123, 2, 12, 2);
    }
    rect(48, 132, 16, 35, 1);
    rect(46, 131, 16, 30, 0);
    rect(47, 132, 14, 28, 2);
    rect(48, 133, 12, 2, 3);
    rect(48, 136, 1, 22, 1);
    rect(49, 151, 10, 1, 1);
    rect(43, 165, 22, 3, 2);
    rect(53, 160, 3, 5, 1);

    // Compact dumbbell storage, with repeated individual plate silhouettes
    rect(170, 119, 58, 21, 1);
    rect(168, 117, 58, 20, 2);
    rect(169, 118, 56, 17, 0);
    for (let x = 174; x < 224; x += 12) {
        rect(x, 125, 9, 2, 2);
        for (const dx of [0, 6]) {
            rect(x + dx, 121, 3, 10, 1);
            rect(x + dx, 121, 1, 9, 3);
            rect(x + dx + 1, 123, 1, 6, 2);
        }
    }
    rect(173, 138, 4, 6, 2);
    rect(217, 138, 4, 6, 2);
    rect(175, 150, 44, 17, 1);
    rect(173, 148, 44, 16, 0);
    rect(174, 149, 42, 1, 1);
    rect(174, 150, 1, 13, 1);
    rect(215, 150, 1, 13, 1);
    for (const x of [183, 202]) {
        rect(x, 154, 5, 5, 1);
        put(x + 1, 154, 2);
    }

    // A pale band and a separate chevron identify the selected menu in grayscale
    rect(16, 184, 224, 1, 1);
    rect(20, 192, 216, 24, 1);
    rect(18, 194, 220, 20, 1);
    rect(21, 193, 214, 21, 2);
    rect(19, 195, 218, 17, 2);
    rect(22, 193, 212, 1, 3);
    rect(19, 196, 1, 15, 3);
    text('ENTER GYM', 56, 201, 0);
    rect(30, 201, 18, 3, 0);
    for (const x of [31, 42]) {
        rect(x, 197, 3, 11, 0);
        rect(x + 1, 198, 1, 8, 1);
    }
    for (let dy = 0; dy < 7; dy++) {
        put(221 + Math.min(dy, 6 - dy), 200 + dy, 0);
        put(220 + Math.min(dy, 6 - dy), 200 + dy, 0);
    }
    text('READY', 104, 218, 2);

    const sprites: Sprite[] = [];
    for (let ty = 0; ty < 3; ty++) {
        for (let tx = 0; tx < 2; tx++) {
            sprites.push({
                x: 120 + tx * 8,
                y: 136 + ty * 8,
                palette: ty,
                pixels: assets.character.slice(ty * 8, ty * 8 + 8).map((row) => row.slice(tx * 8, tx * 8 + 8)),
            });
        }
    }
    const result = { width, height, background: Array.from(background), attributes, palettes, spritePalettes, sprites };
    validateConstruction(result);
    return result;
}

/** Assert actual attribute, tile-bank and sprite budgets, including transparent rows. */
function validateConstruction(scene: Construction): void {
    const { background, sprites, palettes, attributes, spritePalettes } = scene;
    if (scene.width !== width || scene.height !== height) {
        throw new Error('Sample must be 256×240');
    }
    if (background.length !== width * height || background.some((v) => !Number.isInteger(v) || v < 0 || v > 3)) {
        throw new Error('Background must contain 256×240 two-bit pixels');
    }
    if (
        palettes.length > 4 ||
        palettes.some(
            (p) => p.length !== 4 || p[0] !== palettes[0][0] || p.some((c) => !Number.isInteger(c) || c < 0 || c > 63)
        )
    ) {
        throw new Error('Invalid background palettes');
    }
    if (
        attributes.length !== 15 ||
        attributes.some((row) => row.length !== 16 || row.some((p) => !Number.isInteger(p) || !palettes[p]))
    ) {
        throw new Error('Invalid 16×16 attributes');
    }
    const patterns = backgroundPatterns(background);
    if (patterns.length > 256) {
        throw new Error(`Background CHR bank exceeds 256 patterns: ${patterns.length}`);
    }
    if (
        spritePalettes.length > 4 ||
        spritePalettes.some((p) => p.length !== 4 || p.some((c) => !Number.isInteger(c) || c < 0 || c > 63))
    ) {
        throw new Error('Invalid sprite palettes');
    }
    if (new Set(sprites.map((s) => s.pixels.join(''))).size > 256) {
        throw new Error('Sprite CHR bank exceeds 256 patterns');
    }
    if (sprites.length > 64) {
        throw new Error('More than 64 sprites');
    }
    for (const sprite of sprites) {
        if (!Number.isInteger(sprite.palette) || !spritePalettes[sprite.palette]) {
            throw new Error('Invalid sprite palette selection');
        }
        if (sprite.pixels.length !== 8 || sprite.pixels.some((row) => !/^[0-3]{8}$/.test(row))) {
            throw new Error('Sprite must be an 8×8 two-bit pattern');
        }
        if (
            !Number.isInteger(sprite.x) ||
            !Number.isInteger(sprite.y) ||
            sprite.x < 0 ||
            sprite.x > 248 ||
            sprite.y < 0 ||
            sprite.y > 232
        ) {
            throw new Error('Sprite outside frame');
        }
    }
    for (let y = 0; y < height; y++) {
        if (sprites.filter((s) => s.y <= y && s.y + 8 > y).length > 8) {
            throw new Error(`Sprite scanline budget exceeded at ${y}`);
        }
    }
}

/** Flatten only after verifying the background and transparent sprite layers. */
function rasterize(scene: Construction, scale = 1): Uint8Array {
    const { background, attributes, palettes, spritePalettes, sprites } = scene;
    const indexes = background.map(
        (v, i) => palettes[attributes[Math.floor(i / width / 16)][Math.floor((i % width) / 16)]][v]
    );
    for (const sprite of sprites) {
        sprite.pixels.forEach((row, dy) => {
            [...row].forEach((v, dx) => {
                if (v !== '0') {
                    indexes[(sprite.y + dy) * width + sprite.x + dx] = spritePalettes[sprite.palette][Number(v)];
                }
            });
        });
    }
    const data = new Uint8Array(width * height * scale * scale * 3);
    for (let y = 0; y < height * scale; y++) {
        for (let x = 0; x < width * scale; x++) {
            const hex = master[indexes[Math.floor(y / scale) * width + Math.floor(x / scale)]];
            const offset = (y * width * scale + x) * 3;
            for (let c = 0; c < 3; c++) {
                data[offset + c] = Number.parseInt(hex.slice(c * 2, c * 2 + 2), 16);
            }
        }
    }
    return encodePng({ width: width * scale, height: height * scale, data });
}

function backgroundPatterns(background: number[]): string[] {
    const patterns = new Set<string>();
    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            patterns.add(
                Array.from({ length: 8 }, (_, dy) =>
                    background.slice((y + dy) * width + x, (y + dy) * width + x + 8).join('')
                ).join('')
            );
        }
    }
    return [...patterns];
}

interface Assets {
    logo: string[];
    glyphs: Record<string, string[]>;
    character: string[];
    rivet: string[];
}
/** Editable indexed background, attribute table and explicitly placed 8×8 sprites. */
interface Construction {
    width: number;
    height: number;
    background: number[];
    attributes: number[][];
    palettes: number[][];
    spritePalettes: number[][];
    sprites: Sprite[];
}
interface Sprite {
    x: number;
    y: number;
    palette: number;
    pixels: string[];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const sample = renderSample();
    const out = `${root}art/steel-sample`;
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/native.png`, rasterize(sample));
    writeFileSync(`${out}/preview-4x.png`, rasterize(sample, 4));
    writeFileSync(`${out}/construction.json`, JSON.stringify(sample));
    writeFileSync(
        `${out}/verification.json`,
        `${JSON.stringify(
            {
                logicalSize: [width, height],
                backgroundPatterns: backgroundPatterns(sample.background).length,
                backgroundBankLimit: 256,
                spritePatterns: new Set(sample.sprites.map((s) => s.pixels.join(''))).size,
                sprites: sample.sprites.length,
                maximumSpritesPerScanline: Math.max(
                    ...Array.from(
                        { length: height },
                        (_, y) => sample.sprites.filter((s) => s.y <= y && s.y + 8 > y).length
                    )
                ),
                backgroundPalettes: palettes,
                spritePalettes,
            },
            null,
            4
        )}\n`
    );
}

export { renderSample, validateConstruction, rasterize };
export type { Construction };
