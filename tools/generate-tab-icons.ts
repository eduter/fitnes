import { mkdirSync, writeFileSync } from 'node:fs';

const size = 24;
const palettes = {
    amber: ['#747474', '#fc9838', '#fce4a0'],
    blue: ['#747474', '#3cbcfc', '#a8e4fc'],
    mint: ['#747474', '#58f898', '#b0fccc'],
};
const destinations = ['home', 'templates', 'exercises', 'weight', 'history', 'settings'] as const;
const variants = ['a', 'b', 'c'] as const;

/** Regenerate the editable, integer-grid SVG artwork; no image resampling is involved. */
function generate(): void {
    const directory = new URL('../src/components/BottomTabs/icons/', import.meta.url);
    mkdirSync(directory, { recursive: true });
    for (const name of destinations) {
        for (const [index, variant] of variants.entries()) {
            const art = new PixelArt();
            drawIcon(art, name, index);
            const palette =
                name === 'home' || name === 'exercises'
                    ? palettes.amber
                    : name === 'weight'
                      ? palettes.mint
                      : palettes.blue;
            const paths = palette.map((color, ink) => {
                const runs: string[] = [];
                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        if (art.pixels[y * size + x] !== ink + 1) {
                            continue;
                        }
                        const start = x;
                        while (x + 1 < size && art.pixels[y * size + x + 1] === ink + 1) {
                            x++;
                        }
                        runs.push(`M${start} ${y}h${x - start + 1}v1H${start}z`);
                    }
                }
                return `    <path fill="${color}" d="${runs.join('')}"/>`;
            });
            writeFileSync(
                new URL(`${name}-${variant}.svg`, directory),
                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">\n    <title>${name} — option ${variant.toUpperCase()}</title>\n${paths.join('\n')}\n</svg>\n`
            );
        }
    }
}

function drawIcon(art: PixelArt, name: (typeof destinations)[number], option: number): void {
    switch (name) {
        case 'home':
            home(art, option);
            break;
        case 'templates':
            templates(art, option);
            break;
        case 'exercises':
            exercises(art, option);
            break;
        case 'weight':
            weight(art, option);
            break;
        case 'history':
            history(art, option);
            break;
        case 'settings':
            settings(art, option);
            break;
    }
}

function home(p: PixelArt, v: number): void {
    if (v === 2) {
        p.rect(3, 8, 18, 14, 2);
        p.rect(2, 6, 20, 3, 1);
        p.rect(3, 5, 18, 2, 3);
        p.rect(1, 21, 22, 2, 1);
        p.rect(5, 10, 4, 6, 1);
        p.rect(15, 10, 4, 6, 1);
        p.rect(6, 11, 2, 3, 3);
        p.rect(16, 11, 2, 3, 3);
        p.rect(10, 14, 4, 8, 0);
        p.rect(11, 15, 2, 6, 1);
        p.rect(10, 9, 4, 3, 3);
        p.rect(11, 2, 2, 3, 2);
        p.rect(8, 1, 2, 4, 3);
        p.rect(14, 1, 2, 4, 3);
        return;
    }
    p.rect(17, 3, 3, 7, 1);
    p.rect(17, 2, 4, 2, 3);
    p.poly(
        [
            [1, 11],
            [11, 1],
            [13, 1],
            [23, 11],
            [21, 13],
            [12, 5],
            [3, 13],
        ],
        1
    );
    p.poly(
        [
            [2, 10],
            [11, 1],
            [13, 1],
            [22, 10],
            [20, 11],
            [12, 4],
            [4, 11],
        ],
        2
    );
    p.line(3, 9, 11, 1, 3);
    p.rect(5, 11, 14, 11, 1);
    p.rect(5, 11, 12, 9, 2);
    p.rect(5, 11, 2, 9, 3);
    p.rect(3, 21, 18, 2, 1);
    p.rect(4, 20, 16, 1, 3);
    if (v === 0) {
        p.rect(10, 13, 5, 8, 0);
        p.rect(11, 14, 3, 6, 1);
        p.rect(13, 17, 1, 1, 3);
        p.rect(7, 13, 2, 3, 3);
        p.rect(16, 13, 2, 3, 3);
    } else {
        p.rect(9, 12, 8, 5, 0);
        p.rect(10, 13, 6, 3, 3);
        p.rect(12, 13, 2, 3, 1);
        p.rect(8, 18, 10, 2, 1);
        p.rect(9, 17, 2, 3, 3);
        p.rect(15, 17, 2, 3, 3);
    }
}

function templates(p: PixelArt, v: number): void {
    if (v === 1) {
        p.rect(5, 3, 16, 20, 1);
        p.rect(3, 1, 16, 20, 2);
        p.rect(4, 2, 13, 17, 3);
        p.rect(6, 5, 8, 2, 1);
        for (const y of [10, 14, 17]) {
            p.rect(6, y, 2, 2, 2);
            p.rect(10, y, 5, 1, 1);
        }
        p.rect(17, 4, 2, 16, 1);
        return;
    }
    p.rect(4, 3, 16, 20, 1);
    p.rect(3, 2, 16, 20, 2);
    p.rect(4, 3, 13, 17, 3);
    p.rect(8, 1, 7, 4, 1);
    p.rect(9, 0, 5, 4, 2);
    p.rect(10, 1, 3, 1, 3);
    if (v === 0) {
        for (const y of [7, 12, 17]) {
            p.rect(6, y, 2, 2, 1);
            p.rect(10, y, 5, 1, 1);
            p.rect(10, y + 2, 4, 1, 2);
        }
    } else {
        p.rect(6, 7, 9, 2, 1);
        p.rect(6, 11, 3, 2, 2);
        p.rect(11, 11, 4, 1, 1);
        p.line(7, 16, 9, 18, 1);
        p.line(9, 18, 15, 12, 1);
        p.line(7, 17, 9, 19, 2);
        p.line(9, 19, 16, 12, 2);
    }
}

function exercises(p: PixelArt, v: number): void {
    if (v === 1) {
        p.rect(3, 17, 18, 4, 1);
        p.rect(4, 16, 16, 3, 2);
        p.rect(4, 15, 16, 1, 3);
        p.rect(5, 19, 3, 4, 1);
        p.rect(17, 19, 3, 4, 1);
        p.rect(3, 3, 2, 14, 1);
        p.rect(19, 3, 2, 14, 1);
        p.rect(1, 6, 22, 2, 2);
        p.rect(6, 2, 3, 10, 1);
        p.rect(15, 2, 3, 10, 1);
        p.rect(5, 2, 2, 9, 2);
        p.rect(14, 2, 2, 9, 2);
        p.rect(5, 2, 2, 2, 3);
        p.rect(14, 2, 2, 2, 3);
        return;
    }
    p.rect(1, 11, 22, 3, 1);
    p.rect(1, 10, 22, 2, 2);
    p.rect(8, 10, 8, 1, 3);
    for (const x of [4, 16]) {
        p.rect(x, 5, 4, 15, 1);
        p.rect(x, 5, 3, 13, 2);
        p.rect(x, 5, 1, 12, 3);
        p.rect(x, 4, 3, 2, 3);
    }
    for (const x of [1, 20]) {
        p.rect(x, 8, 3, 9, 1);
        p.rect(x, 7, 2, 8, 2);
        p.rect(x, 7, 1, 7, 3);
    }
    if (v === 2) {
        const pixels = [...p.pixels];
        p.pixels.fill(0);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const ink = pixels[y * size + x];
                if (ink) {
                    p.dot(x, y + Math.floor((x - 11) / 3), ink);
                }
            }
        }
    }
}

function weight(p: PixelArt, v: number): void {
    p.rect(3, 3, 18, 19, 1);
    p.rect(2, 2, 18, 19, 2);
    p.rect(3, 1, 16, 21, 2);
    p.rect(3, 2, 16, 1, 3);
    p.rect(2, 3, 1, 17, 3);
    p.rect(5, 4, 12, 7, 1);
    p.rect(6, 5, 10, 5, 3);
    if (v === 1) {
        p.rect(7, 6, 3, 1, 1);
        p.rect(9, 7, 1, 2, 1);
        p.rect(12, 6, 2, 3, 1);
        p.dot(13, 7, 3);
    } else {
        p.line(10, 9, 13, 6, 1);
        p.rect(7, 6, 1, 2, 2);
        p.rect(14, 6, 1, 2, 2);
        p.dot(11, 5, 1);
    }
    if (v === 2) {
        for (const x of [6, 14]) {
            p.rect(x, 13, 3, 5, 1);
            p.rect(x, 12, 3, 2, 3);
            p.rect(x - 1, 17, 4, 2, 1);
        }
    } else {
        for (const x of [5, 13]) {
            p.rect(x, 13, 4, 6, 1);
            p.rect(x, 13, 3, 1, 3);
            p.rect(x, 15, 3, 1, 2);
            p.rect(x, 17, 3, 1, 2);
        }
    }
}

function history(p: PixelArt, v: number): void {
    if (v === 1) {
        p.rect(3, 3, 18, 19, 1);
        p.rect(2, 2, 18, 19, 2);
        p.rect(3, 7, 15, 12, 3);
        p.rect(5, 0, 2, 5, 3);
        p.rect(14, 0, 2, 5, 3);
        for (const y of [9, 13, 16]) {
            for (const x of [5, 10, 15]) {
                p.rect(x, y, 2, 2, 1);
            }
        }
        p.rect(9, 12, 4, 4, 2);
        p.rect(10, 13, 2, 2, 3);
        return;
    }
    p.disc(12, 12, 11, 1);
    p.disc(11, 11, 10, 2);
    p.disc(11, 11, 8, 3);
    p.disc(11, 11, 7, 1);
    for (const [x, y] of [
        [11, 5],
        [17, 11],
        [11, 17],
        [5, 11],
    ]) {
        p.dot(x, y, 3);
    }
    p.rect(10, 7, 2, 6, 3);
    p.rect(11, 11, v === 0 ? 5 : 4, 2, 3);
    p.dot(11, 11, 2);
    if (v === 2) {
        p.rect(0, 2, 6, 9, 0);
        p.rect(1, 6, 3, 6, 2);
        p.rect(1, 9, 7, 3, 2);
        p.rect(1, 6, 1, 4, 3);
    }
}

function settings(p: PixelArt, v: number): void {
    const c = 11;
    if (v === 1) {
        p.disc(c, c, 8, 2);
        for (const [x, y, w, h] of [
            [9, 0, 5, 5],
            [9, 18, 5, 5],
            [0, 9, 5, 5],
            [18, 9, 5, 5],
            [3, 3, 5, 5],
            [15, 3, 5, 5],
            [3, 15, 5, 5],
            [15, 15, 5, 5],
        ]) {
            p.rect(x, y, w, h, 2);
        }
    } else {
        p.disc(c, c, 9, 2);
        for (const [x, y, w, h] of [
            [8, 0, 7, 5],
            [8, 18, 7, 5],
            [0, 8, 5, 7],
            [18, 8, 5, 7],
            [2, 2, 5, 5],
            [16, 2, 5, 5],
            [2, 16, 5, 5],
            [16, 16, 5, 5],
        ]) {
            p.rect(x, y, w, h, 2);
        }
    }
    const pixels = [...p.pixels];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!pixels[y * size + x]) {
                continue;
            }
            if (!pixels[(y - 1) * size + x] || x === 0 || !pixels[y * size + x - 1]) {
                p.dot(x, y, 3);
            } else if (!pixels[(y + 1) * size + x] || x === size - 1 || !pixels[y * size + x + 1]) {
                p.dot(x, y, 1);
            }
        }
    }
    p.disc(c, c, v === 2 ? 6 : 5, 1);
    p.disc(c - 1, c - 1, v === 2 ? 4 : 3, 3);
    p.disc(c, c, v === 2 ? 3 : 2, 0);
    if (v === 2) {
        for (const [x, y] of [
            [11, 3],
            [3, 11],
            [19, 11],
            [11, 19],
        ]) {
            p.dot(x, y, 1);
        }
    }
}

class PixelArt {
    pixels = new Array<number>(size * size).fill(0);

    dot(x: number, y: number, ink: number): void {
        if (x >= 0 && x < size && y >= 0 && y < size) {
            this.pixels[y * size + x] = ink;
        }
    }

    rect(x: number, y: number, width: number, height: number, ink: number): void {
        for (let j = y; j < y + height; j++) {
            for (let i = x; i < x + width; i++) {
                this.dot(i, j, ink);
            }
        }
    }

    line(x: number, y: number, endX: number, endY: number, ink: number): void {
        const steps = Math.max(Math.abs(endX - x), Math.abs(endY - y));
        for (let i = 0; i <= steps; i++) {
            this.dot(Math.round(x + ((endX - x) * i) / steps), Math.round(y + ((endY - y) * i) / steps), ink);
        }
    }

    disc(x: number, y: number, radius: number, ink: number): void {
        for (let j = -radius; j <= radius; j++) {
            for (let i = -radius; i <= radius; i++) {
                if (i * i + j * j <= radius * radius) {
                    this.dot(x + i, y + j, ink);
                }
            }
        }
    }

    poly(points: number[][], ink: number): void {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                let inside = false;
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const [xi, yi] = points[i];
                    const [xj, yj] = points[j];
                    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                        inside = !inside;
                    }
                }
                if (inside) {
                    this.dot(x, y, ink);
                }
            }
        }
    }
}

generate();
