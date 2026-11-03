import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = `${root}art/corner-studies`;
interface Study {
    id: string;
    bar: number;
    plate: number;
    rivet: number;
    bright: boolean;
    rows: string[];
    occupiedPixels: number;
}
const { inks, studies } = JSON.parse(readFileSync(`${out}/assets.json`, 'utf8')) as {
    inks: string[];
    studies: Study[];
};

/** Render editable 16×16 corner studies without resampling or inferred pixel colors. */
function renderCorners(): void {
    for (const { id, rows } of studies) {
        if (rows.length !== 16 || rows.some((row) => !/^[0-3]{16}$/.test(row))) {
            throw new Error(`Corner ${id} must contain sixteen rows of sixteen two-bit pixels`);
        }
        writeFileSync(`${out}/${id}-native.png`, png(rows, 1));
        writeFileSync(`${out}/${id}-12x.png`, png(rows, 12));
    }

    // Labels and spacing are presentation only; each art cell stays exactly 16×16
    const labels: Record<string, string[]> = {
        A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'],
        B: ['11110', '11011', '11011', '11110', '11011', '11011', '11110'],
        C: ['01111', '11000', '11000', '11000', '11000', '11000', '01111'],
        D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
        E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
        F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
    };
    const sheet = Array.from({ length: 80 }, () => Array<number>(128).fill(0));
    studies
        .filter(({ id }) => labels[id])
        .forEach(({ id, rows }, i) => {
            const x = 8 + (i % 3) * 40;
            const y = 6 + Math.floor(i / 3) * 40;
            labels[id].forEach((row, dy) => {
                [...row].forEach((v, dx) => {
                    sheet[y + dy][x + dx] = Number(v) * 2;
                });
            });
            rows.forEach((row, dy) => {
                [...row].forEach((v, dx) => {
                    sheet[y + 12 + dy][x + dx] = Number(v);
                });
            });
        });
    writeFileSync(
        `${out}/comparison-native.png`,
        png(
            sheet.map((row) => row.join('')),
            1
        )
    );
    writeFileSync(
        `${out}/comparison-8x.png`,
        png(
            sheet.map((row) => row.join('')),
            8
        )
    );
}

/** Build 252-pixel panel tops from the chosen corners, preserving their indexed pixels. */
function renderPanelTops(): void {
    const selected = studies.filter(({ id }) => ['D', 'E', 'F', 'G', 'H'].includes(id));
    const labels: Record<string, string[]> = {
        D: ['11110', '11011', '11011', '11011', '11011', '11011', '11110'],
        E: ['11111', '11000', '11000', '11110', '11000', '11000', '11111'],
        F: ['11111', '11000', '11000', '11110', '11000', '11000', '11000'],
        G: ['01111', '11000', '11000', '11011', '11011', '11011', '01111'],
        H: ['11011', '11011', '11011', '11111', '11011', '11011', '11011'],
    };
    const sheet = Array.from({ length: selected.length * 40 }, () => Array<number>(256).fill(0));
    selected.forEach(({ id, bar, rows }, i) => {
        const top = Array.from({ length: 16 }, (_, y) =>
            Array.from({ length: 252 }, (_, x): number => {
                if (y < bar) {
                    return y === 0 ? 2 : 1;
                }
                const edge = Math.min(x, 251 - x);
                return edge < bar ? (edge === 0 ? 2 : 1) : 0;
            })
        );

        // Remove the old study's outer padding, then mirror only the corner geometry
        for (let y = 0; y < 11; y++) {
            for (let x = 0; x < 11; x++) {
                top[y][x] = Number(rows[y + 1][x + 1]);
                top[y][251 - x] = top[y][x];
            }
        }
        const art = top.map((row) => row.join(''));
        writeFileSync(`${out}/${id}-top-native.png`, png(art, 1));
        writeFileSync(`${out}/${id}-top-3x.png`, png(art, 3));
        labels[id].forEach((row, dy) => {
            [...row].forEach((v, dx) => {
                sheet[i * 40 + dy][2 + dx] = Number(v) * 2;
            });
        });
        top.forEach((row, dy) => {
            row.forEach((v, dx) => {
                sheet[i * 40 + 12 + dy][2 + dx] = v;
            });
        });
    });
    writeFileSync(
        `${out}/panel-tops-native.png`,
        png(
            sheet.map((row) => row.join('')),
            1
        )
    );
    writeFileSync(
        `${out}/panel-tops-3x.png`,
        png(
            sheet.map((row) => row.join('')),
            3
        )
    );
}

function png(rows: string[], scale: number): Uint8Array {
    const width = rows[0].length * scale;
    const height = rows.length * scale;
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const ink = inks[Number(rows[Math.floor(y / scale)][Math.floor(x / scale)])];
            for (let c = 0; c < 3; c++) {
                data[(y * width + x) * 3 + c] = Number.parseInt(ink.slice(c * 2, c * 2 + 2), 16);
            }
        }
    }
    return encodePng({ width, height, data });
}

renderCorners();
renderPanelTops();
