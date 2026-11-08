import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkConstruction } from '../nes-hardware/check.ts';
import { decodePng } from '../nes-hardware/png.ts';
import { assetPng, framePixels } from './assets.ts';
import { rgbImage } from './compile.ts';
import type { VerifiedArtifact } from './verification.ts';

/** Save a verified candidate to tracked files, preserving adopted artwork and previous saves. */
function saveArtwork(
    root: string,
    artifact: VerifiedArtifact,
    baselineHash: string,
    emphasis: number,
    pixels: Uint8Array,
    destination = {
        width: 256,
        height: pixels.length / 256,
        saveDirectory: 'art/home/edited',
        imageName: 'gym.png',
        workDirectory: 'work/art-editor',
    }
): string[] {
    const source = dirname(artifact.archive);
    const image = readFileSync(join(source, 'image.png'));
    const construction = readFileSync(join(source, 'construction.json'));
    const report = readFileSync(join(source, 'report.json'));
    const proof = JSON.parse(report.toString('utf8'));
    const seed = JSON.parse(construction.toString('utf8'));
    const expected = rgbImage(framePixels(pixels, destination.width, destination.height, seed.height), emphasis);
    const decoded = decodePng(image);
    if (
        proof.status !== 'pass' ||
        proof.differingPixels !== 0 ||
        proof.imageSha256 !== createHash('sha256').update(image).digest('hex') ||
        !Buffer.from(expected.data).equals(Buffer.from(decoded.data)) ||
        checkConstruction(JSON.parse(construction.toString('utf8')), decoded).status !== 'pass'
    ) {
        throw new Error('The verified files changed. Recheck the image before saving.');
    }
    const target = join(root, destination.saveDirectory);
    const parent = dirname(target);
    mkdirSync(parent, { recursive: true });
    const staged = mkdtempSync(join(parent, '.edited-save-'));
    const backups = join(root, destination.workDirectory, 'saved-backups');
    let backup: string | null = null;
    try {
        if (existsSync(target)) {
            cpSync(target, staged, { recursive: true });
        }
        writeFileSync(
            join(staged, destination.imageName),
            assetPng(pixels, destination.width, destination.height, emphasis)
        );
        if (destination.width !== 256 || destination.height !== seed.height) {
            writeFileSync(join(staged, 'proof-frame.png'), image);
        }
        writeFileSync(join(staged, 'construction.json'), construction);
        writeFileSync(join(staged, 'verification.json'), report);
        writeFileSync(
            join(staged, 'project.json'),
            `${JSON.stringify(
                {
                    format: 'fitnes-art-editor-v1',
                    width: destination.width,
                    height: destination.height,
                    emphasis,
                    baselineHash,
                    pixels: Buffer.from(pixels).toString('base64'),
                },
                null,
                2
            )}\n`
        );
        if (existsSync(target)) {
            mkdirSync(backups, { recursive: true });
            backup = join(mkdtempSync(join(backups, 'save-')), 'edited');
            renameSync(target, backup);
        }
        renameSync(staged, target);
    } catch (error) {
        // A failed directory swap must leave the previous candidate usable
        if (backup && !existsSync(target)) {
            renameSync(backup, target);
        }
        throw error;
    } finally {
        rmSync(staged, { recursive: true, force: true });
    }
    const files = [destination.imageName, 'construction.json', 'project.json', 'verification.json'];
    if (destination.width !== 256 || destination.height !== seed.height) {
        files.push('proof-frame.png');
    }
    return files.map((file) => `${destination.saveDirectory}/${file}`);
}

export { saveArtwork };
