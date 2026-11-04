import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { displayColors } from './nes-hardware/check.ts';
import { encodePng } from './nes-hardware/png.ts';
import type { HardwareConstruction } from './nes-hardware/rom.ts';

const size = 24;
const reference = JSON.parse(
    readFileSync(new URL('../art/home/construction.json', import.meta.url), 'utf8')
) as HardwareConstruction;
const colors = displayColors(reference.emphasis);
const destinations = ['home', 'templates', 'exercises', 'weight', 'history', 'settings'] as const;
const variants = ['a', 'b', 'c'] as const;

/** Paint native PNG assets using the adopted home construction's actual PPU codes and emphasis. */
function generate(): void {
    const directory = new URL('../src/components/BottomTabs/icons/', import.meta.url);
    mkdirSync(directory, { recursive: true });
    for (const name of destinations) {
        for (const [index, variant] of variants.entries()) {
            if (name !== 'home' && index > 0) {
                continue;
            }
            const art = new PixelArt();
            drawIcon(art, name, index);
            const palette = reference.palettes[name === 'exercises' ? 0 : 1];
            // Opaque black is the bar's universal background, not a fourth visible sprite ink
            const codes = [palette[0], palette[2], palette[1], palette[3], reference.palettes[0][3]];
            const data = Uint8Array.from(art.pixels.flatMap((ink) => colors[codes[ink]]));
            writeFileSync(new URL(`${name}-${variant}.png`, directory), encodePng({ width: size, height: size, data }));
        }
    }
    generateFrame(directory);
}

/** Preserve the approved frame geometry while matching its material inks to the home steel palette. */
function generateFrame(directory: URL): void {
    const svg = readFileSync(new URL('../src/components/SteelPanel/steel-panel.svg', import.meta.url), 'utf8');
    const codes: Record<string, number> = { '#000000': 15, '#747474': 7, '#bcbcbc': 0, '#fcfcfc': 16 };
    const data = new Uint8Array(18 * 18 * 3);
    for (const path of svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)) {
        for (const run of path[2].matchAll(/M(\d+) (\d+)h(\d+)v1H\d+z/g)) {
            const [, x, y, width] = run.map(Number);
            for (let i = x; i < x + width; i++) {
                data.set(colors[codes[path[1]]], (y * 18 + i) * 3);
            }
        }
    }
    writeFileSync(new URL('steel-panel-home.png', directory), encodePng({ width: 18, height: 18, data }));
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
    // Keep the approved gable, chimney and footprint; light steel defines edges against black
    p.rect(17, 3, 3, 7, 2);
    p.rect(17, 3, 1, 6, 3);
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
    p.line(13, 2, 21, 10, v === 1 ? 3 : 2);
    p.rect(5, 11, 14, 10, 2);
    p.rect(5, 11, 1, 10, 3);
    p.rect(18, 12, 1, 9, 3);
    p.rect(6, 11, 12, 1, 1);
    p.rect(3, 21, 18, 2, 2);
    p.rect(4, 21, 16, 1, 3);
    p.rect(10, 13, 5, 8, 1);
    p.rect(10, 13, 1, 8, 3);
    p.rect(11, 13, 3, 1, 3);
    p.dot(13, 17, 3);

    // Yellow is confined to window glass; the structure stays steel gray
    if (v === 0) {
        p.rect(7, 12, 2, 3, 4);
        p.rect(16, 12, 2, 3, 4);
        p.rect(7, 15, 2, 1, 1);
        p.rect(16, 15, 2, 1, 1);
    } else if (v === 1) {
        for (const x of [6, 15]) {
            p.rect(x, 11, 4, 5, 3);
            p.rect(x + 1, 12, 2, 3, 4);
            p.rect(x, 15, 4, 1, 2);
        }
        p.rect(7, 18, 2, 1, 1);
        p.rect(16, 18, 2, 1, 1);
    } else {
        p.rect(7, 12, 2, 4, 4);
        p.rect(16, 12, 2, 4, 4);
        p.rect(7, 14, 2, 1, 2);
        p.rect(16, 14, 2, 1, 2);
        for (const [x, y] of [
            [7, 17],
            [16, 17],
            [8, 19],
            [15, 19],
        ]) {
            p.dot(x, y, 1);
        }
        p.rect(11, 20, 3, 1, 3);
        p.rect(9, 7, 6, 1, 1);
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
    if (v === 2) {
        // A medical balance scale has a beam and an upright, not a bathroom-platform silhouette
        p.rect(2, 2, 20, 3, 2);
        p.rect(2, 2, 20, 1, 3);
        p.rect(3, 0, 3, 6, 3);
        p.rect(4, 1, 1, 4, 1);
        p.rect(15, 1, 3, 5, 3);
        p.rect(16, 2, 1, 3, 1);
        p.rect(10, 5, 4, 15, 1);
        p.rect(10, 5, 2, 14, 3);
        p.rect(12, 6, 1, 12, 2);
        p.rect(9, 8, 6, 2, 2);
        p.poly(
            [
                [5, 18],
                [18, 18],
                [23, 21],
                [22, 23],
                [1, 23],
                [1, 21],
            ],
            2
        );
        p.rect(5, 18, 13, 1, 3);
        p.rect(3, 21, 18, 1, 1);
        p.rect(4, 20, 4, 1, 3);
        p.rect(15, 20, 4, 1, 3);
        return;
    }
    if (v === 1) {
        // A shallow glass platform uses corner sensors and a rectangular LCD
        p.poly(
            [
                [3, 5],
                [20, 5],
                [23, 16],
                [21, 20],
                [2, 20],
                [0, 16],
            ],
            1
        );
        p.poly(
            [
                [3, 4],
                [20, 4],
                [23, 15],
                [20, 18],
                [3, 18],
                [0, 15],
            ],
            2
        );
        p.line(3, 4, 20, 4, 3);
        p.line(1, 14, 3, 5, 3);
        p.rect(8, 6, 8, 5, 1);
        p.rect(9, 7, 6, 3, 3);
        p.rect(10, 8, 1, 1, 1);
        p.rect(13, 8, 1, 1, 1);
        for (const [x, y] of [
            [4, 6],
            [18, 6],
            [4, 14],
            [18, 14],
        ]) {
            p.rect(x, y, 2, 2, 3);
            p.dot(x + 1, y + 1, 1);
        }
        p.rect(6, 13, 2, 3, 1);
        p.rect(16, 13, 2, 3, 1);
        return;
    }
    p.poly(
        [
            [7, 1],
            [16, 1],
            [21, 5],
            [22, 20],
            [19, 23],
            [4, 23],
            [1, 20],
            [2, 5],
        ],
        1
    );
    p.poly(
        [
            [7, 0],
            [16, 0],
            [20, 4],
            [21, 19],
            [18, 21],
            [4, 21],
            [2, 19],
            [3, 4],
        ],
        2
    );
    p.line(7, 0, 16, 0, 3);
    p.line(3, 5, 2, 18, 3);
    p.disc(11, 8, 6, 1);
    p.disc(11, 8, 5, 3);
    p.rect(6, 9, 11, 5, 2);
    p.line(11, 10, 14, 5, 1);
    p.rect(7, 5, 1, 2, 2);
    p.rect(15, 5, 1, 2, 2);
    p.dot(11, 3, 1);
    for (const x of [5, 14]) {
        p.rect(x, 14, 4, 5, 1);
        p.rect(x, 14, 3, 1, 3);
        p.rect(x, 16, 3, 1, 2);
    }
}

function history(p: PixelArt, v: number): void {
    if (v === 2) {
        p.rect(10, 3, 12, 19, 1);
        p.rect(8, 1, 12, 19, 2);
        p.rect(9, 2, 9, 16, 3);
        p.rect(12, 5, 5, 1, 1);
        p.rect(12, 8, 5, 1, 2);
        p.rect(12, 11, 5, 1, 2);
        p.rect(12, 15, 5, 1, 1);
        p.poly(
            [
                [0, 12],
                [6, 6],
                [6, 10],
                [10, 10],
                [14, 13],
                [14, 18],
                [11, 18],
                [11, 14],
                [9, 13],
                [6, 13],
                [6, 17],
            ],
            1
        );
        p.poly(
            [
                [0, 11],
                [6, 5],
                [6, 9],
                [10, 9],
                [14, 12],
                [14, 17],
                [11, 17],
                [11, 13],
                [9, 12],
                [6, 12],
                [6, 16],
            ],
            2
        );
        p.line(1, 10, 5, 6, 3);
        p.rect(6, 9, 4, 1, 3);
        return;
    }
    p.disc(13, 13, 10, 1);
    p.disc(13, 12, 10, 2);
    p.disc(13, 12, 8, 3);
    p.disc(13, 12, 7, 0);
    p.rect(12, 7, 2, 6, 3);
    p.rect(13, 12, 5, 2, 3);
    p.dot(13, 12, 2);
    for (const [x, y] of [
        [13, 5],
        [20, 12],
        [13, 19],
    ]) {
        p.dot(x, y, 2);
    }
    if (v === 0) {
        p.rect(0, 1, 11, 8, 0);
        p.poly(
            [
                [0, 6],
                [6, 0],
                [6, 4],
                [13, 4],
                [13, 7],
                [6, 7],
                [6, 11],
            ],
            2
        );
        p.line(1, 5, 5, 1, 3);
        p.rect(6, 4, 7, 1, 3);
    } else {
        p.rect(0, 7, 10, 10, 0);
        p.poly(
            [
                [0, 12],
                [6, 6],
                [6, 10],
                [11, 10],
                [11, 13],
                [6, 13],
                [6, 18],
            ],
            2
        );
        p.line(1, 11, 5, 7, 3);
        p.rect(6, 10, 5, 1, 3);
    }
}

function settings(p: PixelArt, v: number): void {
    const teeth = [8, 6, 8][v];
    const points: number[][] = [];
    for (let tooth = 0; tooth < teeth; tooth++) {
        const angle = (tooth * Math.PI * 2) / teeth - Math.PI / 2;
        const step = (Math.PI * 2) / teeth;
        // Four straight edges per tooth leave deep, open root gaps
        for (const [fraction, radius] of [
            [-0.5, 8],
            [-0.28, 8],
            [-0.22, 11.5],
            [0.22, 11.5],
            [0.28, 8],
        ]) {
            const a = angle + fraction * step;
            points.push([11.5 + Math.cos(a) * radius, 11.5 + Math.sin(a) * radius]);
        }
    }
    p.poly(points, 2);
    const pixels = [...p.pixels];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!pixels[y * size + x]) {
                continue;
            }
            if (y === 0 || !pixels[(y - 1) * size + x]) {
                p.dot(x, y, 3);
            } else if (y === size - 1 || !pixels[(y + 1) * size + x]) {
                p.dot(x, y, 1);
            }
        }
    }
    p.disc(12, 12, 6, 1);
    p.disc(11, 11, 5, 3);
    p.disc(12, 12, 4, 0);
    if (v === 2) {
        for (const [x, y] of [
            [12, 4],
            [4, 12],
            [20, 12],
            [12, 20],
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
