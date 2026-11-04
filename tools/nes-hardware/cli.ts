import { readFileSync } from 'node:fs';
import { checkConstruction } from './check.ts';
import { decodePng } from './png.ts';
import { nativePixels } from './scale.ts';

/** Check exact pixels against a declared hardware profile; this command never repairs an image. */
function main(): void {
    const [constructionPath, imagePath, scale = '1'] = process.argv.slice(2);
    if (!constructionPath || !imagePath) {
        throw new Error('Usage: node tools/nes-hardware/cli.ts construction.json image.png [integer-scale]');
    }
    const construction: unknown = JSON.parse(readFileSync(constructionPath, 'utf8'));
    const image = nativePixels(decodePng(readFileSync(imagePath)), Number(scale));
    const report = { input: imagePath, construction: constructionPath, ...checkConstruction(construction, image) };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === 'pass' ? 0 : 1;
}

try {
    main();
} catch (error) {
    console.error(JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 3;
}
