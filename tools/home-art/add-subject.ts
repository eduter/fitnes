import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../nes-hardware/png.ts';
import { displayColors, checkConstruction } from '../nes-hardware/check.ts';
import { enlarge } from './pixels.ts';
import { describeMaterials, MATERIAL, assertMaterialColors } from './materials.ts';

/** Supply the lifter's deliberate warm skin shades without recoloring the surrounding wall. */
function main(): void {
    const construction = JSON.parse(readFileSync('work/home-art/background.json', 'utf8'));
    const source = decodePng(readFileSync('art/home/hardware/reference-256.png')).data;
    const materials = describeMaterials(source);
    const background = decodePng(readFileSync('work/home-art/background.png'));
    const output = Uint8Array.from(background.data);
    const colors = displayColors(construction.emphasis);
    const palette = [0x0f, 0x26, 0x27, 0x37];
    const sprites = [];
    let changed = 0;
    for (let top = 0; top < 200; top += 8) {
        for (let left = 0; left < 256; left += 8) {
            const pattern = new Uint8Array(64);
            let used = false;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const pixel = (top + y) * 256 + left + x;
                    if (materials.kind[pixel] !== MATERIAL.skin) continue;
                    const code = materials.desired[pixel];
                    const slot = palette.indexOf(code);
                    if (slot <= 0) throw new Error(`Skin color $${code.toString(16)} is outside the sprite palette`);
                    pattern[y * 8 + x] = slot;
                    output.set(colors[code], pixel * 3);
                    used = true;
                    changed++;
                }
            }
            if (used) sprites.push({ x: left, y: top, palette: 0, pixels: Buffer.from(pattern).toString('base64') });
        }
    }
    construction.spritePalettes = [palette];
    construction.sprites = sprites;
    construction.spriteMode = 8;
    construction.backgroundPixels = construction.pixels;
    delete construction.pixels;
    assertMaterialColors(materials, output, colors);
    const report = checkConstruction(construction, { width: 256, height: 200, data: output });
    if (report.status !== 'pass') throw new Error(`Hardware construction failed: ${report.problems.join('; ')}`);
    writeFileSync('art/home/hardware/construction.json', JSON.stringify(construction, null, 2) + '\n');
    writeFileSync('art/home/gym.png', encodePng({ width: 256, height: 200, data: output }));
    writeFileSync('art/home/gym-3x.png', encodePng(enlarge({ width: 256, height: 200, data: output }, 3)));
    console.log({
        skinPalette: palette.map((code) => code.toString(16)),
        sprites: sprites.length,
        skinPixels: changed,
    });
}

main();
