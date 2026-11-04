import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction, displayColors } from './check.ts';
import { decodePng } from './png.ts';
it('keeps the retained final artwork consistent with its indexed source and palette', () => {
    const construction = JSON.parse(readFileSync(new URL('../../art/home/construction.json', import.meta.url), 'utf8'));
    const image = decodePng(readFileSync(new URL('../../art/home/gym.png', import.meta.url)));
    expect(checkConstruction(construction, image).status).toBe('pass');
});

it('keeps the steel panel inks in the home artwork metal palette with the same emphasis', () => {
    const construction = JSON.parse(readFileSync(new URL('../../art/home/construction.json', import.meta.url), 'utf8'));
    const svg = readFileSync(new URL('../../src/components/SteelPanel/steel-panel.svg', import.meta.url), 'utf8');
    const colors = displayColors(construction.emphasis);
    const metalInks = construction.palettes[1].map(
        (code: number) => `#${colors[code].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
    );
    const panelInks = [...svg.matchAll(/fill="(#[\da-f]{6})"/g)].map((match) => match[1]);
    expect(panelInks).toHaveLength(4);
    expect(new Set(panelInks)).toEqual(new Set(metalInks));
});
