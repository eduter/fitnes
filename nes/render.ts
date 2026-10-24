import type { CompiledScreen } from './compile.ts';
import { ATTRIBUTE_REGION_SIZE, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_SIZE } from './hardware.ts';
import type { MasterPalette } from './palette.ts';
import type { RgbImage } from './png.ts';

/**
 * Draw the background at native 256 × 240. A pixel's 2-bit value picks an
 * entry of its region's subpalette; value 0 is always the universal color,
 * whatever the region, which is the hardware's shared backdrop entry.
 */
function renderScreen(screen: CompiledScreen, master: MasterPalette): RgbImage {
    const { palettes, patternTable, nametable, attributes, sprites } = screen;
    const data = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT * 3);
    const opaque = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);

    for (let y = 0; y < SCREEN_HEIGHT; y++) {
        for (let x = 0; x < SCREEN_WIDTH; x++) {
            const pattern = patternTable[nametable[y >> 3][x >> 3]];
            const value = pattern[(y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)];
            const subpalette = attributes[Math.floor(y / ATTRIBUTE_REGION_SIZE)][Math.floor(x / ATTRIBUTE_REGION_SIZE)];
            const index = value === 0 ? palettes.universal : palettes.background[subpalette][value - 1];

            const { r, g, b } = master.colors[index];
            const offset = y * SCREEN_WIDTH + x;
            data[offset * 3] = r;
            data[offset * 3 + 1] = g;
            data[offset * 3 + 2] = b;
            opaque[offset] = value === 0 ? 0 : 1;
        }
    }

    // Earlier OAM entries sit in front, so paint the list from the back
    const spritePalettes = palettes.sprite ?? [];
    for (let index = sprites.length - 1; index >= 0; index--) {
        const sprite = sprites[index];
        const colors = spritePalettes[sprite.palette];
        if (colors === undefined) {
            continue;
        }
        for (let y = 0; y < sprite.height; y++) {
            const pixelY = sprite.y + y;
            if (pixelY < 0 || pixelY >= SCREEN_HEIGHT) {
                continue;
            }
            for (let x = 0; x < TILE_SIZE; x++) {
                const value = sprite.pixels[y * TILE_SIZE + x];
                const pixelX = sprite.x + x;
                if (value === 0 || pixelX < 0 || pixelX >= SCREEN_WIDTH) {
                    continue;
                }
                const offset = pixelY * SCREEN_WIDTH + pixelX;
                if (sprite.behind && opaque[offset] === 1) {
                    continue;
                }
                const { r, g, b } = master.colors[colors[value - 1]];
                data[offset * 3] = r;
                data[offset * 3 + 1] = g;
                data[offset * 3 + 2] = b;
            }
        }
    }

    return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, data };
}

export { renderScreen };
