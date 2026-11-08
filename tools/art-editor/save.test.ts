import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { decodePng } from '../nes-hardware/png.ts';
import { imageCodes } from './compile.ts';
import { saveArtwork } from './save.ts';

vi.mock('node:fs', { spy: true });

it('replaces only current artwork, preserves neighbors, and rejects mismatched pixels', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fitnes-art-save-'));
    try {
        const source = join(root, 'proof');
        mkdirSync(source);
        mkdirSync(join(root, 'art/home'), { recursive: true });
        writeFileSync(join(root, 'art/home/notes.txt'), 'keep my notes');
        const original = readFileSync('art/home/gym.png');
        const seed = JSON.parse(readFileSync('art/home/construction.json', 'utf8'));
        writeFileSync(join(root, 'art/home/gym.png'), 'previous artwork');
        cpSync('art/home/gym.png', join(source, 'image.png'));
        cpSync('art/home/construction.json', join(source, 'construction.json'));
        const hash = createHash('sha256').update(original).digest('hex');
        writeFileSync(
            join(source, 'report.json'),
            JSON.stringify({ status: 'pass', differingPixels: 0, imageSha256: hash })
        );
        const pixels = imageCodes(decodePng(original), seed);
        const artifact = { archive: join(source, 'proof.tar.gz'), imageHash: hash, pixels };
        const files = saveArtwork(root, artifact, 'baseline', 1, pixels);
        expect(files).toEqual(['art/home/gym.png', 'art/home/construction.json']);
        expect(readFileSync(join(root, 'art/home/gym.png'))).toEqual(original);
        expect(readFileSync(join(root, 'art/home/notes.txt'), 'utf8')).toBe('keep my notes');
        expect(JSON.parse(readFileSync(join(root, 'work/art-editor/saved/project.json'), 'utf8')).pixels).toBe(
            Buffer.from(pixels).toString('base64')
        );
        const changed = pixels.slice();
        changed[0] = 32;
        expect(() => saveArtwork(root, artifact, 'baseline', 1, changed)).toThrow('changed');
        expect(readFileSync(join(root, 'art/home/gym.png'))).toEqual(original);
        expect(existsSync(join(root, 'work/art-editor/saved-backups'))).toBe(true);

        const realFs = await vi.importActual<typeof import('node:fs')>('node:fs');
        const priorImage = Buffer.from('previous image to restore');
        const priorConstruction = readFileSync(join(root, 'art/home/construction.json'));
        writeFileSync(join(root, 'art/home/gym.png'), priorImage);
        vi.mocked(renameSync)
            .mockImplementationOnce(realFs.renameSync)
            .mockImplementationOnce(() => {
                throw new Error('Injected construction replacement failure');
            });
        expect(() => saveArtwork(root, artifact, 'baseline', 1, pixels)).toThrow('Injected');
        expect(readFileSync(join(root, 'art/home/gym.png'))).toEqual(priorImage);
        expect(readFileSync(join(root, 'art/home/construction.json'))).toEqual(priorConstruction);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
