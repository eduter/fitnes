import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../../src/components/SteelPanel/', import.meta.url));
const corner = JSON.parse(readFileSync(`${directory}corner.json`, 'utf8')) as string[];
const inks = ['#000000', '#747474', '#bcbcbc', '#fcfcfc'];

if (corner.length !== 8 || corner.some((row) => !/^[0-3]{8}$/.test(row))) {
    throw new Error('SteelPanel corner must contain eight rows of eight two-bit pixels');
}

// The two center pixels are straight material; CSS stretches only those edge slices
const pixels = Array.from({ length: 18 }, (_, y) =>
    Array.from({ length: 18 }, (_, x): number => {
        const edge = Math.min(x, y, 17 - x, 17 - y);
        return edge === 0 ? 2 : edge < 4 ? 1 : 0;
    })
);
for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
        const ink = Number(corner[y][x]);
        pixels[y][x] = ink;
        pixels[y][17 - x] = ink;
        pixels[17 - y][x] = ink;
        pixels[17 - y][17 - x] = ink;
    }
}
const paths = inks.map((fill, ink) => {
    const runs: string[] = [];
    for (let y = 0; y < 18; y++) {
        let x = 0;
        while (x < 18) {
            if (pixels[y][x] !== ink) {
                x++;
                continue;
            }
            const start = x;
            while (x < 18 && pixels[y][x] === ink) {
                x++;
            }
            runs.push(`M${start} ${y}h${x - start}v1H${start}z`);
        }
    }
    return `    <path fill="${fill}" d="${runs.join('')}"/>`;
});
writeFileSync(
    `${directory}steel-panel.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" shape-rendering="crispEdges">\n    <title>Decorative steel panel border</title>\n${paths.join('\n')}\n</svg>\n`
);
