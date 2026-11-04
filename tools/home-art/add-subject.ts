import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../nes-hardware/png.ts';
import { enlarge } from './pixels.ts';

/** Add a bounded, explicit sprite layer for the lifter’s highlights. */
function main(): void {
    const m = JSON.parse(readFileSync('work/home-art/background.json', 'utf8'));
    const profile = JSON.parse(readFileSync('tools/nes-hardware/palettes/composite-direct-fbx.json', 'utf8'));
    const colors = profile.colors.map((s: string) =>
        [0, 2, 4].map((j, i) =>
            Math.min(255, Math.floor(parseInt(s.slice(j, j + 2), 16) * profile.emphasisMultipliers[m.emphasis][i]))
        )
    );
    const labs = colors.map(lab);
    const source = decodePng(readFileSync('art/home/hardware/reference-256.png')).data;
    const bg = decodePng(readFileSync('work/home-art/background.png')),
        output = Uint8Array.from(bg.data);
    const coords: number[] = [];
    for (let y = 88; y < 152; y++) for (let x = 104; x < 152; x++) coords.push(y * 256 + x);
    const dist = coords.map((p) => {
        const a = lab([...source.subarray(p * 3, p * 3 + 3)]);
        return labs.map((b: number[]) => distance(a, b));
    });
    const base = coords.map((p) =>
        distance(lab([...source.subarray(p * 3, p * 3 + 3)]), lab([...bg.data.subarray(p * 3, p * 3 + 3)]))
    );
    const pool = Array.from({ length: 64 }, (_, i) => i).filter(
        (c) => ![0x0d, 0x0e, 0x1d, 0x1e, 0x1f, 0x2e, 0x2f, 0x3e, 0x3f].includes(c)
    );
    const gains = pool
        .map((c) => ({ c, gain: dist.reduce((sum, d, i) => sum + Math.max(0, base[i] - d[c]), 0) }))
        .sort((a, b) => b.gain - a.gain)
        .slice(0, 15)
        .map((x) => x.c);
    let best = Infinity,
        chosen: number[] = [];
    for (let a = 0; a < gains.length; a++)
        for (let b = a + 1; b < gains.length; b++)
            for (let c = b + 1; c < gains.length; c++) {
                const pal = [gains[a], gains[b], gains[c]];
                let error = 0;
                for (let i = 0; i < coords.length; i++) error += Math.min(base[i], ...pal.map((c) => dist[i][c]));
                if (error < best) {
                    best = error;
                    chosen = pal;
                }
            }
    const sprites = [];
    let changed = 0;
    for (let ty = 88; ty < 152; ty += 8)
        for (let tx = 104; tx < 152; tx += 8) {
            const pixels = new Uint8Array(64);
            let used = false;
            for (let y = 0; y < 8; y++)
                for (let x = 0; x < 8; x++) {
                    const p = (ty + y) * 256 + tx + x,
                        i = (ty + y - 88) * 48 + (tx + x - 104),
                        slot = chosen.reduce((a, c, j) => (dist[i][c] < dist[i][chosen[a]] ? j : a), 0);
                    if (dist[i][chosen[slot]] + 1e-6 < base[i]) {
                        pixels[y * 8 + x] = slot + 1;
                        output.set(colors[chosen[slot]], p * 3);
                        used = true;
                        changed++;
                    }
                }
            if (used) sprites.push({ x: tx, y: ty, palette: 0, pixels: Buffer.from(pixels).toString('base64') });
        }
    m.spritePalettes = [[15, ...chosen]];
    m.sprites = sprites;
    m.spriteMode = 8;
    m.backgroundPixels = m.pixels;
    delete m.pixels;
    writeFileSync('art/home/hardware/construction.json', JSON.stringify(m, null, 2) + '\n');
    writeFileSync('art/home/gym.png', encodePng({ width: 256, height: 200, data: output }));
    writeFileSync('art/home/gym-3x.png', encodePng(enlarge({ width: 256, height: 200, data: output }, 3)));
    console.log({ palette: chosen.map((c) => c.toString(16)), sprites: sprites.length, changed });
}
function distance(a: number[], b: number[]) {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
function lab(rgb: number[]) {
    const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
        m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
        s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

main();
