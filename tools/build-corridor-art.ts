import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkConstruction, displayColors } from './nes-hardware/check.ts';
import { encodePng, type RgbImage } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

const DIRECTORY = 'art/corridor/vertical';

/** Rebuild the selected corridor sample and prove every tile-aligned viewport and retained character pose. */
function buildCorridorArt(): void {
    const character = JSON.parse(readFileSync(join(DIRECTORY, 'character.json'), 'utf8')) as Character;
    const home = JSON.parse(readFileSync('art/home/construction.json', 'utf8')) as HardwareConstruction;
    const layout = JSON.parse(readFileSync(join(DIRECTORY, 'layout.json'), 'utf8')) as CorridorLayout;
    const map = assembleMap(layout, home);
    if (JSON.stringify(map.palettes) !== JSON.stringify(home.palettes) || map.emphasis !== home.emphasis) {
        throw new Error('The corridor must share the home background palettes and emphasis');
    }
    if (map.width !== 256 || map.height !== 384 || map.regionSize !== 8 || map.profile !== 'mmc5-exattr') {
        throw new Error('Expected the selected 256×384 map with MMC5 8×8 attributes');
    }
    const background = renderBackground(map);

    // Overlapping hardware-sized views cover the tall map without treating it as one oversized NES frame
    const proofDirectory = 'work/corridor-proof';
    mkdirSync(proofDirectory, { recursive: true });
    let checks = 0;
    for (let scrollY = 0; scrollY <= map.height - 240; scrollY += 8) {
        for (const pose of Object.keys(character.poses)) {
            const construction = frameConstruction(map, character, scrollY, pose);
            const image = renderFrame(background, construction, scrollY);
            const report = checkConstruction(construction, image);
            if (report.status !== 'pass') {
                throw new Error(`Corridor scroll=${scrollY}, pose=${pose}: ${report.problems.join('; ')}`);
            }
            checks++;
            if (pose === 'back-idle') {
                writePair(proofDirectory, `scroll-${scrollY}`, construction, image);
            }
        }
    }

    // Retain the bottom view as the exact checker input and a tall overview for judging phone composition
    const scrollY = 144;
    const construction = frameConstruction(map, character, scrollY, 'back-idle');
    const image = renderFrame(background, construction, scrollY);
    const overview = { ...background, data: background.data.slice() };
    overview.data.set(image.data, scrollY * map.width * 3);
    writePair(DIRECTORY, 'sample', construction, image);
    writeFileSync(join(DIRECTORY, 'map.json'), `${JSON.stringify(map, null, 2)}\n`);
    writeFileSync(join(DIRECTORY, 'background.png'), encodePng(background));
    writeFileSync(join(DIRECTORY, 'overview.png'), encodePng(overview));
    for (const [pose, rows] of Object.entries(character.poses)) {
        writeFileSync(join(DIRECTORY, `${pose}.svg`), characterSvg(character, rows, map.emphasis));
    }
    console.log(
        JSON.stringify(
            {
                checks,
                viewports: (map.height - 240) / 8 + 1,
                poses: Object.keys(character.poses).length,
                ...checkConstruction(construction, image),
            },
            null,
            2
        )
    );
}

interface Character {
    width: number;
    height: number;
    spritePalettes: number[][];
    inks: Record<string, { palette: number; slot: number }>;
    poses: Record<string, string[]>;
}

function assembleMap(layout: CorridorLayout, home: HardwareConstruction): HardwareConstruction {
    const { width, height, tileSize, tiles, grid } = layout;
    if (tileSize !== 8) {
        throw new Error('The top-view corridor uses native 8×8 tiles');
    }
    if (grid.length !== height / 8 || grid.some((row) => row.length !== width / 8)) {
        throw new Error('Corridor placement rows do not cover the native map');
    }
    const attributes: number[] = [];
    const pixels = new Uint8Array(width * height);
    for (const [ty, row] of grid.entries()) {
        for (const [tx, symbol] of [...row].entries()) {
            const tile = tiles[symbol];
            if (!tile) {
                throw new Error(`Unknown corridor tile '${symbol}' at (${tx}, ${ty})`);
            }
            if (tile.rows.length !== 8 || tile.rows.some((pattern) => !/^[0-3]{8}$/.test(pattern))) {
                throw new Error(`Corridor tile '${symbol}' must contain exact 8×8 two-bit pixels`);
            }
            attributes.push(tile.palette);
            for (const [y, pattern] of tile.rows.entries()) {
                for (const [x, slot] of [...pattern].entries()) {
                    pixels[(ty * 8 + y) * width + tx * 8 + x] = Number(slot);
                }
            }
        }
    }
    return {
        profile: 'mmc5-exattr',
        displayPalette: home.displayPalette,
        emphasis: home.emphasis,
        width,
        height,
        regionSize: 8,
        palettes: home.palettes,
        attributes,
        backgroundPixels: Buffer.from(pixels).toString('base64'),
    };
}

interface CorridorLayout {
    width: number;
    height: number;
    tileSize: number;
    tiles: Record<string, { palette: number; rows: string[] }>;
    grid: string[];
}

function renderBackground(map: HardwareConstruction): RgbImage {
    const { width, height, palettes, attributes, emphasis, backgroundPixels } = map;
    const slots = Buffer.from(backgroundPixels, 'base64');
    if (slots.length !== width * height || attributes.length !== (width / 8) * (height / 8)) {
        throw new Error('Map dimensions differ from its indexed pixels or attribute grid');
    }
    const colors = displayColors(emphasis);
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const palette = palettes[attributes[Math.floor(y / 8) * 32 + Math.floor(x / 8)]];
            data.set(colors[palette[slots[y * width + x]]], (y * width + x) * 3);
        }
    }
    return { width, height, data };
}

function frameConstruction(
    map: HardwareConstruction,
    character: Character,
    scrollY: number,
    pose: string
): HardwareConstruction {
    const { backgroundPixels, attributes } = map;
    return {
        ...map,
        height: 240,
        attributes: attributes.slice((scrollY / 8) * 32, ((scrollY + 240) / 8) * 32),
        backgroundPixels: Buffer.from(backgroundPixels, 'base64')
            .subarray(scrollY * 256, (scrollY + 240) * 256)
            .toString('base64'),
        spriteMode: 8,
        spritePalettes: character.spritePalettes,
        sprites: characterSprites(character, pose),
    };
}

function characterSprites(character: Character, pose: string): NonNullable<HardwareConstruction['sprites']> {
    const { poses, inks, spritePalettes, width, height } = character;
    const rows = poses[pose];
    if (width !== 16 || height !== 16 || rows.length !== 16 || rows.some((row) => row.length !== 16)) {
        throw new Error(`Character pose '${pose}' must have exact 16×16 cells`);
    }
    const sprites: NonNullable<HardwareConstruction['sprites']> = [];

    // Skin and opaque dark ink use separate hardware palettes, keeping the home's skin and metal colors
    for (let palette = 0; palette < spritePalettes.length; palette++) {
        for (let top = 0; top < height; top += 8) {
            for (let left = 0; left < width; left += 8) {
                const pixels = new Uint8Array(64);
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        const symbol = rows[top + y][left + x];
                        if (symbol === '.') {
                            continue;
                        }
                        const ink = inks[symbol];
                        if (!ink) {
                            throw new Error(`Unknown character ink '${symbol}' in pose '${pose}'`);
                        }
                        if (ink.palette === palette) {
                            pixels[y * 8 + x] = ink.slot;
                        }
                    }
                }
                if (pixels.some((slot) => slot > 0)) {
                    sprites.push({
                        x: 120 + left,
                        y: 176 + top,
                        palette,
                        pixels: Buffer.from(pixels).toString('base64'),
                    });
                }
            }
        }
    }
    return sprites;
}

function renderFrame(background: RgbImage, construction: HardwareConstruction, scrollY: number): RgbImage {
    const { width, emphasis, spritePalettes, sprites } = construction;
    const data = background.data.slice(scrollY * width * 3, (scrollY + 240) * width * 3);
    const colors = displayColors(emphasis);
    const occupied = new Uint8Array(width * 240);
    for (const sprite of sprites ?? []) {
        const pixels = Buffer.from(sprite.pixels, 'base64');
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const slot = pixels[y * 8 + x];
                const pixel = (sprite.y + y) * width + sprite.x + x;
                if (slot === 0 || occupied[pixel]) {
                    continue;
                }
                if (!spritePalettes) {
                    throw new Error('Character sprites require their declared hardware palettes');
                }
                data.set(colors[spritePalettes[sprite.palette][slot]], pixel * 3);
                occupied[pixel] = 1;
            }
        }
    }
    return { width, height: 240, data };
}

function writePair(directory: string, name: string, construction: HardwareConstruction, image: RgbImage): void {
    writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(construction, null, 2)}\n`);
    writeFileSync(join(directory, `${name}.png`), encodePng(image));
}

function characterSvg(character: Character, rows: string[], emphasis: number): string {
    const { inks, spritePalettes } = character;
    const colors = displayColors(emphasis);
    const rectangles = rows.flatMap((row, y) =>
        [...row].flatMap((symbol, x) => {
            if (symbol === '.') {
                return [];
            }
            const ink = inks[symbol];
            const color = colors[spritePalettes[ink.palette][ink.slot]]
                .map((channel) => channel.toString(16).padStart(2, '0'))
                .join('');
            return [`<rect x="${x}" y="${y}" width="1" height="1" fill="#${color}"/>`];
        })
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">${rectangles.join('')}</svg>\n`;
}

buildCorridorArt();
