import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction } from './check.ts';
import { decodePng } from './png.ts';
it('keeps the retained final artwork consistent with its indexed source and palette', () => {
    const construction = JSON.parse(readFileSync(new URL('../../art/home/construction.json', import.meta.url), 'utf8'));
    const image = decodePng(readFileSync(new URL('../../art/home/gym.png', import.meta.url)));
    expect(checkConstruction(construction, image).status).toBe('pass');
});
