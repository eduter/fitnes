import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const source = readFileSync('docs/reference-home-screen-image.png');
const normalization = JSON.parse(readFileSync('art/home/hardware/source.json', 'utf8'));
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== normalization.originalSha256) {
    throw new Error('The pushed reference changed. Recreate its normalized input before converting it.');
}
const normalizedHash = createHash('sha256').update(readFileSync(normalization.normalized)).digest('hex');
if (normalizedHash !== normalization.normalizedSha256) {
    throw new Error('The normalized reference differs from its recorded source preparation');
}
await import('./convert.ts');
await import('./add-subject.ts');
await import('./build-rom.ts');
