import { readFileSync, writeFileSync } from 'node:fs';
import { checkConstruction } from './check.ts';
import { decodePng } from './png.ts';
import { buildRom, type HardwareConstruction } from './rom.ts';

const [constructionPath, imagePath, outputPath] = process.argv.slice(2);
if (!constructionPath || !imagePath || !outputPath) {
    throw new Error('Usage: nes:rom -- construction.json image.png output.nes');
}
const construction = JSON.parse(readFileSync(constructionPath, 'utf8')) as HardwareConstruction;
const report = checkConstruction(construction, decodePng(readFileSync(imagePath)));
if (report.status !== 'pass') {
    throw new Error(report.problems.join('; '));
}
writeFileSync(outputPath, buildRom(construction));
console.log(JSON.stringify({ output: outputPath, ...report }, null, 2));
