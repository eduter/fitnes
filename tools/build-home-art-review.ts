import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

/** Package the isolated artwork comparison without app data or service workers. */
function main(): void {
    const out = 'work/home-art-review';
    // A later search may retain fewer candidates; stale previews must not survive that change
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    for (const file of [
        'index.html',
        'report.json',
        'gym-linen.png',
        'gym-warm-linen.png',
        'logo-source.png',
        'logo-current-filter.png',
        'logo-nearest.png',
        'logo-dithered.png',
    ]) {
        cpSync(`art/home/study/${file}`, `${out}/${file}`);
    }
    cpSync('art/home/gym.png', `${out}/gym-original.png`);
    cpSync('docs/reference-home-screen-image.png', `${out}/hero-original-reference.png`);
    const report = JSON.parse(readFileSync('art/home/study/hero-report.json', 'utf8'));
    for (const file of [
        'hero-source-native.png',
        'hero-material-target.png',
        'hero-report.json',
        'gym-reference-fit.png',
        'gym-existing-refit.png',
        'gym-crisp-alternative.png',
        ...Object.keys(report.candidates).map((name) => `${name}.png`),
    ]) {
        cpSync(`art/home/study/${file}`, `${out}/${file}`);
    }
}

main();
