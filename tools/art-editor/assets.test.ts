import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

it('keeps the original home draft identity and the preferred logo pixels', () => {
    const home = assets.find((asset) => asset.id === 'home');
    expect(home?.workDirectory).toBe('work/art-editor');
    expect(home?.saveDirectory).toBe('art/home/edited');
    const seed = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
    expect(
        createHash('sha256')
            .update(home?.image ?? new Uint8Array())
            .update(JSON.stringify(home?.seed))
            .digest('hex')
    ).toBe(createHash('sha256').update(readFileSync('art/home/gym.png')).update(JSON.stringify(seed)).digest('hex'));
    expect(assets.find((asset) => asset.id === 'logo')?.height).toBe(120);
});

it('keeps the hand-edited Home candidate, editable project and proof consistent', () => {
    const image = readFileSync('art/home/edited/gym.png');
    const project = JSON.parse(readFileSync('art/home/edited/project.json', 'utf8'));
    const construction = JSON.parse(readFileSync('art/home/edited/construction.json', 'utf8'));
    const proof = JSON.parse(readFileSync('art/home/edited/verification.json', 'utf8'));
    const pixels = Buffer.from(project.pixels, 'base64');
    expect(decodePng(assetPng(pixels, project.width, project.height, project.emphasis))).toEqual(decodePng(image));
    expect(checkConstruction(construction, decodePng(image)).status).toBe('pass');
    expect(proof.status).toBe('pass');
    expect(proof.differingPixels).toBe(0);
    expect(proof.imageSha256).toBe(createHash('sha256').update(image).digest('hex'));
});
