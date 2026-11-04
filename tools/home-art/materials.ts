const MATERIAL = { neutral: 0, brick: 1, skin: 2, hazard: 3, light: 4, sign: 5, lightShade: 6 } as const;
const RUST = [0x16, 0x17, 0x26, 0x27];

/** Pixel roles and exact art overrides for this specific 256×200 reference. */
interface MaterialMap {
    kind: Uint8Array;
    desired: Int16Array;
}

/** Preserve material boundaries when neighboring pixels share an NES attribute tile. */
function describeMaterials(source: Uint8Array): MaterialMap {
    const kind = new Uint8Array(256 * 200);
    const desired = new Int16Array(256 * 200).fill(-1);
    const bricks = [
        [
            [44, 35],
            [54, 35],
            [56, 37],
            [61, 36],
            [68, 35],
            [71, 38],
            [68, 43],
            [64, 47],
            [60, 52],
            [54, 48],
            [49, 43],
            [46, 39],
        ],
        [
            [77, 75],
            [82, 80],
            [83, 86],
            [79, 91],
            [74, 97],
            [70, 99],
            [65, 95],
            [60, 90],
            [64, 84],
            [69, 81],
            [74, 78],
        ],
        [
            [246, 53],
            [247, 87],
            [240, 91],
            [234, 92],
            [230, 88],
            [224, 83],
            [221, 77],
            [232, 66],
            [240, 57],
        ],
    ];
    const skin = [
        [
            [109, 93],
            [114, 93],
            [115, 103],
            [122, 112],
            [119, 118],
            [113, 114],
            [110, 104],
        ],
        [
            [141, 93],
            [146, 93],
            [145, 105],
            [141, 114],
            [136, 118],
            [133, 112],
            [139, 103],
        ],
        [
            [118, 112],
            [124, 110],
            [133, 110],
            [138, 114],
            [135, 124],
            [121, 124],
            [118, 120],
        ],
        [
            [124, 104],
            [130, 102],
            [133, 105],
            [133, 111],
            [129, 114],
            [124, 111],
        ],
        [
            [115, 125],
            [122, 124],
            [125, 127],
            [122, 131],
            [117, 134],
            [114, 135],
            [112, 132],
        ],
        [
            [112, 134],
            [116, 134],
            [116, 143],
            [115, 148],
            [112, 148],
            [110, 139],
        ],
        [
            [134, 124],
            [141, 126],
            [144, 132],
            [140, 136],
            [136, 132],
            [131, 128],
        ],
        [
            [140, 133],
            [144, 134],
            [145, 140],
            [143, 148],
            [140, 148],
            [140, 140],
        ],
    ];
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 256; x++) {
            const p = y * 256 + x;
            const [r, g, b] = source.subarray(p * 3, p * 3 + 3);
            const warmPaint = r > 135 && r - g > 40 && g - b > 20;
            const hazard =
                warmPaint &&
                ((y >= 191 && x >= 52 && x <= 202) ||
                    (x <= 12 && y >= 99 && y <= 140) ||
                    (x >= 221 && x <= 247 && y >= 120 && y <= 128));
            const rayArea =
                inside(x, y, [
                    [112, 28],
                    [139, 28],
                    [164, 64],
                    [88, 64],
                ]) &&
                r > 135 &&
                g - b > 16;
            let localRed = 0;
            if (rayArea) {
                for (let yy = y - 1; yy <= y + 1; yy++)
                    for (let xx = x - 1; xx <= x + 1; xx++) localRed += source[(yy * 256 + xx) * 3];
                localRed /= 9;
            }
            const ray =
                rayArea &&
                r > 155 &&
                g > 110 &&
                g - b > 24 &&
                (r > localRed + 4 || (y < 35 && r > 205 && (x + y) % 2 === 0));
            const bulb = x >= 113 && x <= 142 && y >= 23 && y <= 29 && r > 185 && g > 155;
            const skinPixel = r > 150 && r - g > 30 && g - b > 20 && skin.some((polygon) => inside(x, y, polygon));
            if (skinPixel) {
                kind[p] = MATERIAL.skin;
                const brightness = 0.3 * r + 0.59 * g + 0.11 * b;
                desired[p] = brightness > 190 ? 0x37 : brightness > 150 ? 0x27 : 0x26;
            } else if (hazard) {
                kind[p] = MATERIAL.hazard;
                desired[p] = 0x38;
            } else if (ray || bulb) {
                kind[p] = MATERIAL.light;
                desired[p] = 0x38;
            } else if (rayArea) {
                kind[p] = MATERIAL.lightShade;
            } else if (r > 120 && r - g > 45 && g - b > 24 && bricks.some((polygon) => inside(x, y, polygon))) {
                kind[p] = MATERIAL.brick;
            }
        }
    }

    // The sign is deliberately redrawn at native resolution for legibility
    for (let y = 55; y <= 79; y++)
        for (let x = 31; x <= 74; x++) {
            const p = y * 256 + x;
            kind[p] = MATERIAL.sign;
            desired[p] = x === 31 || x === 74 || y === 55 || y === 79 ? 0x0f : 0x10;
        }
    for (const y of [57, 76])
        for (const x of [33, 71]) {
            for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) desired[yy * 256 + xx] = 0x0f;
        }
    const glyphs: Record<string, string[]> = {
        N: ['1001', '1101', '1101', '1011', '1011', '1001'],
        O: ['0110', '1001', '1001', '1001', '1001', '0110'],
        E: ['1111', '1000', '1110', '1000', '1000', '1111'],
        X: ['1001', '1001', '0110', '0110', '1001', '1001'],
        C: ['0111', '1000', '1000', '1000', '1000', '0111'],
        U: ['1001', '1001', '1001', '1001', '1001', '0110'],
        S: ['0111', '1000', '0110', '0001', '0001', '1110'],
    };
    for (const [text, left, top] of [['EXCUSES', 36, 68]] as const) {
        [...text].forEach((character, i) =>
            glyphs[character].forEach((row, y) =>
                [...row].forEach((pixel, x) => {
                    if (pixel === '1') desired[(top + y) * 256 + left + i * 5 + x] = 0x0f;
                })
            )
        );
    }
    const heading = {
        N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    };
    (['N', 'O'] as const).forEach((letter, i) =>
        heading[letter].forEach((row, y) =>
            [...row].forEach((pixel, x) => {
                if (pixel === '1') desired[(58 + y) * 256 + 47 + i * 6 + x] = 0x0f;
            })
        )
    );
    return { kind, desired };
}

/** Colors permitted in a background pixel; skin's warm finish is supplied by sprites. */
function backgroundColorAllowed(material: number, desired: number, code: number): boolean {
    if (material === MATERIAL.skin) return !RUST.includes(code);
    if (material === MATERIAL.lightShade && code === 0x38) return false;
    if (desired >= 0) return code === desired;
    if (material === MATERIAL.brick) return [0x0f, 0x07, 0x17, 0x26].includes(code);
    return !RUST.includes(code);
}

/** Stop a build if its delivered colors cross an authored material boundary. */
function assertMaterialColors(materials: MaterialMap, data: Uint8Array, colors: number[][]): void {
    const color = (rgb: ArrayLike<number>) => `${rgb[0]},${rgb[1]},${rgb[2]}`;
    const rust = new Set(RUST.map((code) => color(colors[code])));
    const brick = new Set([0x0f, 0x07, 0x17, 0x26].map((code) => color(colors[code])));
    for (let p = 0; p < materials.kind.length; p++) {
        const actual = color(data.subarray(p * 3, p * 3 + 3));
        const desired = materials.desired[p];
        const kind = materials.kind[p];
        let valid = true;
        if (desired >= 0) valid = actual === color(colors[desired]);
        else if (kind === MATERIAL.brick) valid = brick.has(actual);
        else valid = !rust.has(actual) && (kind !== MATERIAL.lightShade || actual !== color(colors[0x38]));
        if (!valid) throw new Error(`Material color violation at (${p % 256},${Math.floor(p / 256)})`);
    }
}

function inside(x: number, y: number, polygon: number[][]): boolean {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i],
            [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
    }
    return result;
}

export { MATERIAL, RUST, describeMaterials, backgroundColorAllowed, assertMaterialColors };
export type { MaterialMap };
