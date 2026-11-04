import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../nes-hardware/png.ts';
import { mkdirSync } from 'node:fs';

/** Quantize only the pushed reference, using four shared palettes and explicit material color roles. */
function main(): void {
    const emphasis = Number(process.argv[2] ?? 1),
        region = Number(process.argv[3] ?? 8);
    const profile = JSON.parse(readFileSync('tools/nes-hardware/palettes/composite-direct-fbx.json', 'utf8'));
    const multiplier = profile.emphasisMultipliers[emphasis];
    const colors: number[][] = profile.colors.map((hex: string) =>
        [0, 2, 4].map((j, i) => Math.min(255, Math.floor(parseInt(hex.slice(j, j + 2), 16) * multiplier[i])))
    );
    const source = decodePng(readFileSync('art/home/hardware/reference-256.png')).data;
    const n = 256 * 200,
        rows = Math.ceil(200 / region),
        cols = 256 / region,
        count = cols * rows;
    const dist = new Float32Array(n * 64),
        labs = colors.map(lab),
        frequency = new Uint32Array(64);
    for (let p = 0; p < n; p++) {
        const target = lab([...source.subarray(p * 3, p * 3 + 3)]),
            x = p % 256,
            y = Math.floor(p / 256),
            [r, g, b] = source.subarray(p * 3, p * 3 + 3);
        const colored = r - g > 45 && g - b > 20;
        const stripes = colored && y >= 191 && x >= 52 && x <= 202;
        const brick =
            colored &&
            ((x >= 44 && x <= 75 && y >= 33 && y <= 52) ||
                (x >= 60 && x <= 87 && y >= 79 && y <= 98) ||
                (x >= 228 && y >= 50 && y <= 99));
        let best = Infinity,
            nearest = 15;
        for (let c = 0; c < 64; c++) {
            let d =
                (target[0] - labs[c][0]) ** 2 +
                1.4 * (target[1] - labs[c][1]) ** 2 +
                1.4 * (target[2] - labs[c][2]) ** 2;
            if (stripes && ![0x38].includes(c)) d += 2;
            if (brick && ![0x07, 0x16, 0x17, 0x26].includes(c)) d += 2;
            if (c === 0x0d || [0x0e, 0x1d, 0x1e, 0x1f, 0x2e, 0x2f, 0x3e, 0x3f].includes(c)) d = 100;
            dist[p * 64 + c] = d;
            if (d < best) {
                best = d;
                nearest = c;
            }
        }
        frequency[nearest]++;
    }
    const pool = Array.from({ length: 64 }, (_, i) => i)
        .filter((i) => i !== 15 && frequency[i] > 0)
        .sort((a, b) => frequency[b] - frequency[a])
        .slice(0, 18);
    for (const i of [0x28, 0x38, 0x16, 0x17, 0x26]) if (!pool.includes(i)) pool.push(i);
    const candidates: number[][] = [];
    for (let a = 0; a < pool.length; a++)
        for (let b = a + 1; b < pool.length; b++)
            for (let c = b + 1; c < pool.length; c++) candidates.push([15, pool[a], pool[b], pool[c]]);
    const costs = candidates.map((pal) => {
        const result = new Float64Array(count);
        for (let p = 0; p < n; p++) {
            const block = Math.floor(Math.floor(p / 256) / region) * cols + Math.floor((p % 256) / region);
            let best = Infinity;
            for (const c of pal) best = Math.min(best, dist[p * 64 + c]);
            result[block] += best;
        }
        return result;
    });
    const selected: number[] = [];
    for (let step = 0; step < 4; step++) {
        let best = Infinity,
            choice = 0;
        for (let i = 0; i < candidates.length; i++) {
            let cost = 0;
            for (let r = 0; r < count; r++) {
                let v = costs[i][r];
                for (const c of selected) v = Math.min(v, costs[c][r]);
                cost += v;
            }
            if (cost < best) {
                best = cost;
                choice = i;
            }
        }
        selected.push(choice);
    }
    for (let it = 0; it < 8; it++) {
        let changed = false;
        for (let slot = 0; slot < 4; slot++) {
            const other = selected.filter((_, i) => i !== slot);
            let best = Infinity,
                choice = selected[slot];
            for (let i = 0; i < candidates.length; i++) {
                let cost = 0;
                for (let r = 0; r < count; r++) {
                    let v = costs[i][r];
                    for (const c of other) v = Math.min(v, costs[c][r]);
                    cost += v;
                }
                if (cost < best) {
                    best = cost;
                    choice = i;
                }
            }
            if (choice !== selected[slot]) changed = true;
            selected[slot] = choice;
        }
        if (!changed) break;
    }
    const palettes = selected.map((i) => candidates[i]);
    const attrs = Array.from({ length: count }, (_, r) =>
        selected.reduce((best, c, i) => (costs[c][r] < costs[selected[best]][r] ? i : best), 0)
    );
    const slots = new Uint8Array(n),
        out = new Uint8Array(n * 3);
    let error = 0;
    for (let p = 0; p < n; p++) {
        const block = Math.floor(Math.floor(p / 256) / region) * cols + Math.floor((p % 256) / region),
            pal = palettes[attrs[block]];
        const slot = pal.reduce((best, c, i) => (dist[p * 64 + c] < dist[p * 64 + pal[best]] ? i : best), 0);
        slots[p] = slot;
        out.set(colors[pal[slot]], p * 3);
        const a = lab([...source.subarray(p * 3, p * 3 + 3)]),
            b = labs[pal[slot]];
        error += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    }
    mkdirSync('work/home-art', { recursive: true });
    const stem = 'work/home-art/background';
    writeFileSync(`${stem}.png`, encodePng({ width: 256, height: 200, data: out }));
    writeFileSync(
        `${stem}.json`,
        JSON.stringify(
            {
                profile: region === 8 ? 'mmc5-exattr' : 'stock',
                displayPalette: 'composite-direct-fbx',
                emphasis,
                width: 256,
                height: 200,
                regionSize: region,
                palettes,
                attributes: attrs,
                pixels: Buffer.from(slots).toString('base64'),
                meanSquaredOklabError: error / n,
            },
            null,
            2
        ) + '\n'
    );

    console.log({ stem, palettes: palettes.map((p) => p.map((i) => i.toString(16))), error: error / n });
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
