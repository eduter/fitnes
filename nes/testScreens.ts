import type { AssetDocument } from './assets.ts';
import { compileScreen } from './compile.ts';

/** An 8 × 8 tile of one pixel value, written as asset pixel rows. */
function solidTile(value: 0 | 1 | 2 | 3): string[] {
    return Array.from({ length: 8 }, () => String(value).repeat(8));
}

/** An 8 × 8 tile that uses every 2-bit value, so each subpalette entry is visible. */
function stripeTile(): string[] {
    return Array.from({ length: 8 }, () => '00112233');
}

/** Minimal assets for constraint tests: solid tiles, a frame, and a two-glyph font. */
function testAssets(): AssetDocument[] {
    const frame = Object.fromEntries(
        ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'].map((part) => [`box.${part}`, solidTile(2)])
    );

    return [
        {
            file: 'test-assets.json',
            value: {
                tiles: { one: solidTile(1), two: solidTile(2), three: solidTile(3), stripe: stripeTile(), ...frame },
                fonts: { mono: { glyphs: { A: solidTile(3), ' ': solidTile(0) } } },
                spriteTiles: { dot: solidTile(1), ring: ['11111111', ...Array(6).fill('10000001'), '11111111'] },
            },
        },
    ];
}

/** A valid empty screen; spread fields over it to build each fixture. */
function testScreen(fields: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        name: 'test',
        width: 256,
        height: 240,
        assets: [],
        palettes: {
            universal: '$0F',
            background: [
                ['$01', '$11', '$21'],
                ['$06', '$16', '$26'],
                ['$09', '$19', '$29'],
                ['$00', '$10', '$20'],
            ],
            sprite: [
                ['$02', '$12', '$22'],
                ['$07', '$17', '$27'],
                ['$0A', '$1A', '$2A'],
                ['$2D', '$3D', '$30'],
            ],
        },
        layers: [],
        ...fields,
    };
}

/** Compile a fixture screen against `testAssets`. */
function compileTest(fields: Record<string, unknown> = {}) {
    return compileScreen(testScreen(fields), { file: 'test.json', assets: testAssets() });
}

export { compileTest, solidTile, testAssets, testScreen };
