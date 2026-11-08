import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkConstruction } from '../nes-hardware/check.ts';
import { decodePng } from '../nes-hardware/png.ts';
import { assetPng, framePixels } from './assets.ts';
import { rgbImage } from './compile.ts';
import type { VerifiedArtifact } from './verification.ts';

/** Replace current artwork with verified pixels, keeping recovery files under ignored work/. */
function saveArtwork(
    root: string,
    artifact: VerifiedArtifact,
    baselineHash: string,
    emphasis: number,
    pixels: Uint8Array,
    destination = {
        width: 256,
        height: pixels.length / 256,
        saveDirectory: 'art/home',
        imageName: 'gym.png',
        constructionName: 'construction.json',
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
    const work = join(root, destination.workDirectory);
    mkdirSync(target, { recursive: true });
    const staged = mkdtempSync(join(target, '.art-save-'));
    const backups = join(work, 'saved-backups');
    mkdirSync(backups, { recursive: true });
    const backup = mkdtempSync(join(backups, 'save-'));
    const files = [destination.imageName, destination.constructionName];
    const replaced: string[] = [];
    try {
        // Back up only this asset; neighboring tiles and references belong to other files
        for (const file of files) {
            if (existsSync(join(target, file))) {
                cpSync(join(target, file), join(backup, file));
            }
        }
        writeFileSync(
            join(staged, destination.imageName),
            assetPng(pixels, destination.width, destination.height, emphasis)
        );
        writeFileSync(join(staged, destination.constructionName), construction);

        const saved = join(work, 'saved');
        mkdirSync(saved, { recursive: true });
        writeFileSync(join(saved, 'verification.json'), report);
        writeFileSync(
            join(saved, 'project.json'),
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
        for (const file of files) {
            renameSync(join(staged, file), join(target, file));
            replaced.push(file);
        }
    } catch (error) {
        // A failed multi-file save must restore the previous matching image and construction
        for (const file of replaced) {
            const previous = join(backup, file);
            if (existsSync(previous)) {
                cpSync(previous, join(target, file));
            } else {
                rmSync(join(target, file), { force: true });
            }
        }
        throw error;
    } finally {
        rmSync(staged, { recursive: true, force: true });
    }
    return files.map((file) => `${destination.saveDirectory}/${file}`);
}

export { saveArtwork };
