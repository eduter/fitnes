import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = `${root}art/tab-panel-studies`;
const source = JSON.parse(readFileSync(`${root}art/corner-studies/assets.json`, 'utf8')) as {
    inks: string[];
    studies: { id: string; rows: string[] }[];
};
const icons = JSON.parse(readFileSync(`${out}/icons.json`, 'utf8')) as Record<string, Record<string, string[]>>;
const labels: Record<string, string[]> = {
    A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'],
    B: ['11110', '11011', '11011', '11110', '11011', '11011', '11110'],
    C: ['01111', '11000', '11000', '11000', '11000', '11000', '01111'],
    D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
    E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
};
const variants = [
    { id: 'A', count: 4, size: 24, captions: false },
    { id: 'B', count: 5, size: 24, captions: false },
    { id: 'C', count: 5, size: 32, captions: false },
    { id: 'D', count: 6, size: 24, captions: false },
    { id: 'E', count: 5, size: 16, captions: true },
];

/** Render bottom-navigation art at a 256-pixel logical width with two black pixels outside its frame. */
function renderTabPanels(): void {
    const h = source.studies.find(({ id }) => id === 'H');
    if (!h) {
        throw new Error('Missing approved H corner source');
    }
    const corner = h.rows.map((row) => [...row].map(Number));
    // Add the fourth bar pixel behind H's plate, retaining its one-pixel outer cut
    for (let i = 7; i < 12; i++) {
        corner[4][i] = 1;
        corner[i][4] = 1;
    }
    writeFileSync(
        `${out}/corner-H4.json`,
        `${JSON.stringify(
            corner.map((row) => row.join('')),
            null,
            4
        )}\n`
    );
    const sheet = Array.from({ length: variants.length * 64 }, () => Array<number>(256).fill(0));
    const report = [];
    for (const { id, count, size, captions } of variants) {
        const panel = Array.from({ length: 48 }, () => Array<number>(256).fill(0));
        for (let y = 2; y < 46; y++) {
            for (let x = 2; x < 254; x++) {
                const edge = Math.min(x - 2, 253 - x, y - 2, 45 - y);
                panel[y][x] = edge === 0 ? 2 : edge < 4 ? 1 : 0;
            }
        }
        for (let y = 0; y < 11; y++) {
            for (let x = 0; x < 11; x++) {
                const ink = corner[y + 1][x + 1];
                panel[y + 2][x + 2] = ink;
                panel[y + 2][253 - x] = ink;
                panel[45 - y][x + 2] = ink;
                panel[45 - y][253 - x] = ink;
            }
        }
        const names =
            count === 4
                ? ['home', 'train', 'stats', 'setup']
                : count === 5
                  ? ['home', 'train', 'log', 'stats', 'setup']
                  : ['home', 'train', 'log', 'clock', 'stats', 'setup'];
        const cells = [];
        let left = 6;
        const available = 244 - (count - 1);
        for (let i = 0; i < count; i++) {
            const cellWidth = Math.floor(((i + 1) * available) / count) - Math.floor((i * available) / count);
            const x = left + Math.floor((cellWidth - size) / 2);
            const y = captions ? 9 : 24 - size / 2;
            const rows = icons[size][names[i]];
            if (rows.length !== size || rows.some((row) => !new RegExp(`^[0-3]{${size}}$`).test(row))) {
                throw new Error(`Invalid ${size}px icon ${names[i]}`);
            }
            rows.forEach((row, dy) => {
                [...row].forEach((v, dx) => {
                    if (v !== '0') {
                        panel[y + dy][x + dx] = Number(v);
                    }
                });
            });
            if (captions) {
                const title = names[i].toUpperCase();
                const titleWidth = [...title].reduce((sum, char) => sum + labels[char][0].length + 1, -1);
                text(panel, title, left + Math.floor((cellWidth - titleWidth) / 2), 31, i === 1 ? 3 : 2);
            }
            if (i === 1) {
                for (let dx = 0; dx < 18; dx++) {
                    panel[40][left + Math.floor((cellWidth - 18) / 2) + dx] = 3;
                }
            }
            cells.push({ name: names[i], width: cellWidth, iconSize: size, sideSpace: cellWidth - size });
            left += cellWidth;
            if (i < count - 1) {
                for (let sy = 10; sy < 38; sy++) {
                    panel[sy][left] = 1;
                }
                left++;
            }
        }
        const art = panel.map((row) => row.join(''));
        writeFileSync(`${out}/${id}-native.png`, png(art, 1));
        writeFileSync(`${out}/${id}-3x.png`, png(art, 3));
        writeFileSync(`${out}/${id}-pixels.json`, `${JSON.stringify(art, null, 4)}\n`);
        const offset = variants.findIndex((v) => v.id === id) * 64;
        text(sheet, id, 2, offset, 2);
        panel.forEach((row, dy) => {
            row.forEach((ink, dx) => {
                sheet[offset + 12 + dy][dx] = ink;
            });
        });
        report.push({
            id,
            count,
            size,
            captions,
            dimensions: [256, 48],
            outerMargin: 2,
            frameWidth: 4,
            innerWidth: 244,
            separatorWidth: 1,
            cells,
        });
    }
    writeFileSync(
        `${out}/comparison-native.png`,
        png(
            sheet.map((row) => row.join('')),
            1
        )
    );
    writeFileSync(
        `${out}/comparison-3x.png`,
        png(
            sheet.map((row) => row.join('')),
            3
        )
    );
    writeFileSync(`${out}/layout.json`, `${JSON.stringify(report, null, 4)}\n`);
}

function text(pixels: number[][], title: string, x: number, y: number, ink: number): void {
    for (const char of title) {
        const rows = labels[char];
        if (!rows) {
            throw new Error(`Missing glyph ${char}`);
        }
        rows.forEach((row, dy) => {
            [...row].forEach((v, dx) => {
                if (v === '1') {
                    pixels[y + dy][x + dx] = ink;
                }
            });
        });
        x += rows[0].length + 1;
    }
}

function png(rows: string[], scale: number): Uint8Array {
    const width = rows[0].length * scale;
    const height = rows.length * scale;
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const ink = source.inks[Number(rows[Math.floor(y / scale)][Math.floor(x / scale)])];
            for (let c = 0; c < 3; c++) {
                data[(y * width + x) * 3 + c] = Number.parseInt(ink.slice(c * 2, c * 2 + 2), 16);
            }
        }
    }
    return encodePng({ width, height, data });
}

renderTabPanels();
