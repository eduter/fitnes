import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { displayColors } from '../../tools/nes-hardware/check.ts';
import { decodePng } from '../../tools/nes-hardware/png.ts';
import { homePalette } from './palette.ts';

it('includes every home-art color with its exact PPU-derived RGB and CSS token', () => {
    const construction = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
    const codes = new Set<number>([...construction.palettes.flat(), ...construction.spritePalettes.flat()]);
    const colors = displayColors(construction.emphasis);
    const css = readFileSync('src/design-system/tokens.css', 'utf8');
    expect(new Set(homePalette.map(({ code }) => code))).toEqual(codes);
    const image = decodePng(readFileSync('art/home/gym.png'));
    const actual = new Set<string>();
    for (let i = 0; i < image.data.length; i += 3) {
        actual.add(`#${[...image.data.subarray(i, i + 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
    }
    expect(new Set(homePalette.map(({ hex }) => hex))).toEqual(actual);
    for (const color of homePalette) {
        expect(`#${colors[color.code].map((v) => v.toString(16).padStart(2, '0')).join('')}`).toBe(color.hex);
        expect(css).toContain(`--nes-color-${color.token}: ${color.hex};`);
    }
});
