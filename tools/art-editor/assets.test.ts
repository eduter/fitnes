import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { checkConstruction } from '../nes-hardware/check.ts';
import { decodePng } from '../nes-hardware/png.ts';
import { assetPng, framePixels, listArtwork } from './assets.ts';
import { compilePixels, rgbImage } from './compile.ts';

const assets = listArtwork(process.cwd());
it.each(assets.map((asset) => [asset.id, asset] as const))('proves exact native pixels for %s', (_, asset) => {
    const frame = framePixels(asset.pixels, asset.width, asset.height, asset.seed.height);
    const result = compilePixels(frame, asset.seed);
    expect(result.ok).toBe(true);
    if (result.ok) {
        expect(checkConstruction(result.construction, rgbImage(frame, 1)).status).toBe('pass');
    }
    const encoded = decodePng(assetPng(asset.pixels, asset.width, asset.height, 1));
    const source = decodePng(asset.image);
    expect(encoded).toEqual(source);
});

it('keeps one current image per asset with isolated drafts', () => {
    const home = assets.find((asset) => asset.id === 'home');
    expect(home?.workDirectory).toBe('work/art-editor');
    expect(home?.saveDirectory).toBe('art/home');
    const seed = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
    expect(
        createHash('sha256')
            .update(home?.image ?? new Uint8Array())
            .update(JSON.stringify(home?.seed))
            .digest('hex')
    ).toBe(createHash('sha256').update(readFileSync('art/home/gym.png')).update(JSON.stringify(seed)).digest('hex'));
    expect(assets.find((asset) => asset.id === 'logo')?.height).toBe(120);
});

it('uses the edited hero as the canonical artwork without retaining candidate images', () => {
    const image = readFileSync('art/home/gym.png');
    const construction = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
    expect(checkConstruction(construction, decodePng(image)).status).toBe('pass');
    expect(createHash('sha256').update(image).digest('hex')).toBe(
        '0401a9e94f9837c0a77e96430c046c53e6a66f6908ebe0def67e70c831010c77'
    );
    expect(existsSync('art/home/edited')).toBe(false);
    expect(existsSync('art/logo/reference.png')).toBe(false);
    expect(assets.find((asset) => asset.id === 'logo')?.reference).toBe('docs/fitnes-logo.png');
});
