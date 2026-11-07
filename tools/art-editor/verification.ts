import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { encodePng } from '../nes-hardware/png.ts';
import type { HardwareConstruction } from '../nes-hardware/rom.ts';
import { compilePixels, rgbImage } from './compile.ts';
import type { VerificationResult } from './protocol.ts';

const run = promisify(execFile);

/** A cached exact proof with its downloadable PNG, construction, ROM and emulator evidence. */
interface VerifiedArtifact {
    pixels: Uint8Array;
    archive: string;
    imageHash: string;
}

/** Check exact constructions and run FCEUmm; cache only proofs for identical pixels and core bytes. */
function createVerifier(
    root: string,
    corePath: string,
    seed: HardwareConstruction
): {
    verify: (
        pixels: Uint8Array,
        revision: number
    ) => Promise<{ result: VerificationResult; artifact?: VerifiedArtifact }>;
} {
    const cache = new Map<string, VerifiedArtifact>();
    const directory = join(root, 'work/art-editor/checks');
    mkdirSync(directory, { recursive: true });

    async function verify(
        pixels: Uint8Array,
        revision: number
    ): Promise<{ result: VerificationResult; artifact?: VerifiedArtifact }> {
        const started = performance.now();
        const image = encodePng(rgbImage(pixels, seed.emphasis));
        const imageHash = createHash('sha256').update(image).digest('hex');
        const result: VerificationResult = {
            revision,
            status: 'unverified',
            reason: '',
            regions: [],
            elapsedMs: 0,
            imageHash,
        };
        const proof = compilePixels(pixels, seed);
        if (!proof.ok) {
            return {
                result: {
                    ...result,
                    reason: proof.reason,
                    detail: proof.detail,
                    regions: proof.regions,
                    elapsedMs: performance.now() - started,
                },
            };
        }
        if (!existsSync(corePath)) {
            return {
                result: {
                    ...result,
                    status: 'emulator-unavailable',
                    reason: 'Exact layout passed. Set up the emulator before this image can turn green.',
                    detail: 'In Ubuntu, run npm run nes:emulator:setup, then restart the editor.',
                    elapsedMs: performance.now() - started,
                },
            };
        }
        const coreHash = createHash('sha256').update(readFileSync(corePath)).digest('hex');
        const key = `${imageHash}:${coreHash}`;
        const cached = cache.get(key);
        if (cached) {
            cache.delete(key);
            cache.set(key, cached);
            return {
                result: {
                    ...result,
                    status: 'verified',
                    reason: 'Verified — restored an already-checked image.',
                    fromCache: true,
                    elapsedMs: performance.now() - started,
                },
                artifact: cached,
            };
        }
        const job = mkdtempSync(join(directory, 'check-'));
        writeFileSync(join(job, 'image.png'), image);
        writeFileSync(join(job, 'construction.json'), JSON.stringify(proof.construction));
        try {
            await run(
                process.execPath,
                [
                    join(root, 'tools/nes-hardware/emulate.ts'),
                    join(job, 'construction.json'),
                    join(job, 'image.png'),
                    corePath,
                    '--out',
                    job,
                ],
                { cwd: root, timeout: 15000, maxBuffer: 256000 }
            );
            const report = JSON.parse(readFileSync(join(job, 'report.json'), 'utf8'));
            if (
                report.status !== 'pass' ||
                report.differingPixels !== 0 ||
                report.imageSha256 !== imageHash ||
                report.coreSha256 !== coreHash
            ) {
                throw new Error('The emulator did not reproduce these exact image and core bytes');
            }
            const archive = join(job, 'verified-art.tar.gz');
            await run('tar', [
                '-czf',
                archive,
                '-C',
                job,
                'image.png',
                'construction.json',
                'frame.nes',
                'capture.png',
                'report.json',
            ]);
            const artifact = { pixels: pixels.slice(), archive, imageHash };
            cache.set(key, artifact);
            while (cache.size > 16) {
                const oldest = cache.entries().next().value;
                if (!oldest) {
                    break;
                }
                cache.delete(oldest[0]);
                rmSync(join(oldest[1].archive, '..'), { recursive: true, force: true });
            }
            return {
                result: {
                    ...result,
                    status: 'verified',
                    reason: 'Verified — exact NES check and real emulator passed.',
                    elapsedMs: performance.now() - started,
                },
                artifact,
            };
        } catch (error) {
            // Failed jobs are never cached or exported as verified artifacts
            rmSync(job, { recursive: true, force: true });
            return {
                result: {
                    ...result,
                    reason: 'The emulator could not verify this edit. Your pixels have been kept.',
                    detail: error instanceof Error ? error.message : String(error),
                    elapsedMs: performance.now() - started,
                },
            };
        }
    }
    return { verify };
}

export type { VerifiedArtifact };
export { createVerifier };
