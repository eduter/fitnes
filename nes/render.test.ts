import { describe, expect, it } from 'vitest';
import { masterPalette } from './palette.ts';
import { renderScreen } from './render.ts';
import { compileTest } from './testScreens.ts';

const master = masterPalette();

function render(fields: Record<string, unknown>) {
    const result = compileTest(fields);
    if (result.screen === undefined) {
        throw new Error(`fixture did not compile: ${JSON.stringify(result.diagnostics)}`);
    }
    return renderScreen(result.screen, master);
}

function pixel(image: ReturnType<typeof render>, x: number, y: number) {
    const offset = (y * image.width + x) * 3;
    return { r: image.data[offset], g: image.data[offset + 1], b: image.data[offset + 2] };
}

describe('renderScreen', () => {
    it('renders exactly 256×240 RGB pixels', () => {
        const image = render({});

        expect(image.width).toBe(256);
        expect(image.height).toBe(240);
        expect(image.data).toHaveLength(256 * 240 * 3);
    });

    it('fills untouched cells with the universal color', () => {
        const image = render({});

        expect(pixel(image, 0, 0)).toEqual(master.colors[0x0f]);
        expect(pixel(image, 255, 239)).toEqual(master.colors[0x0f]);
    });

    it('maps pixel values 1–3 through the region subpalette and 0 to the universal color in every region', () => {
        const image = render({
            layers: [
                { op: 'fill', x: 0, y: 0, w: 2, h: 2, tile: 'stripe', palette: 0 },
                { op: 'fill', x: 30, y: 28, w: 2, h: 2, tile: 'stripe', palette: 2 },
            ],
        });

        expect(pixel(image, 0, 0)).toEqual(master.colors[0x0f]);
        expect(pixel(image, 2, 0)).toEqual(master.colors[0x01]);
        expect(pixel(image, 4, 0)).toEqual(master.colors[0x11]);
        expect(pixel(image, 6, 0)).toEqual(master.colors[0x21]);
        expect(pixel(image, 240, 224)).toEqual(master.colors[0x0f]);
        expect(pixel(image, 246, 239)).toEqual(master.colors[0x29]);
    });

    it('uses the universal color for value 0 even when a subpalette repeats it as a color', () => {
        const image = render({
            palettes: {
                universal: '$21',
                background: [
                    ['$0F', '$0F', '$0F'],
                    ['$0F', '$0F', '$0F'],
                    ['$0F', '$0F', '$0F'],
                    ['$0F', '$0F', '$0F'],
                ],
            },
            layers: [{ op: 'fill', x: 0, y: 0, w: 1, h: 1, tile: 'stripe', palette: 3 }],
        });

        expect(pixel(image, 0, 0)).toEqual(master.colors[0x21]);
        expect(pixel(image, 7, 0)).toEqual(master.colors[0x0f]);
    });

    it('is deterministic for the same screen', () => {
        const fields = { layers: [{ op: 'text', x: 3, y: 3, text: 'A A', font: 'mono', palette: 1 }] };

        expect(render(fields).data).toEqual(render(fields).data);
    });
});
