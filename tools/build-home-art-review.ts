import { cpSync, mkdirSync } from 'node:fs';

/** Package the isolated artwork comparison without app data or service workers. */
function main(): void {
    const out = 'work/home-art-review';
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
}

main();
