import { expect, it } from 'vitest';
import { renderPwaIcon } from './pwa-icon.ts';

it('bakes rounded light spots into a launcher icon without adding color or brightness', () => {
    const source = { width: 256, height: 200, data: new Uint8Array(256 * 200 * 3).fill(200) };
    const image = renderPwaIcon(source, 540);
    const center = (3 * image.width + 3) * 3;
    expect(image.data[center]).toBeGreaterThan(image.data[0] + 40);
    expect(Math.max(...image.data.subarray(0, 540 * 3))).toBeLessThanOrEqual(200);
    expect(image.data.every((channel, index) => channel === image.data[index - (index % 3)])).toBe(true);
});

it('keeps the approved crop and produces deterministic opaque RGB at every shipped size', () => {
    const source = { width: 256, height: 200, data: new Uint8Array(256 * 200 * 3) };
    for (let y = 65; y < 155; y++) {
        for (let x = 83; x < 173; x++) {
            source.data[(y * 256 + x) * 3 + 2] = 180;
        }
    }
    for (const size of [48, 64, 180, 192, 512]) {
        const image = renderPwaIcon(source, size);
        expect(image.width).toBe(size);
        expect(image.height).toBe(size);
        expect(image.data.length).toBe(size * size * 3);
        expect(Buffer.from(image.data).equals(Buffer.from(renderPwaIcon(source, size).data))).toBe(true);
        expect(
            image.data.every((channel, index) => (index % 3 === 2 ? channel > 0 && channel <= 180 : channel === 0))
        ).toBe(true);
    }
});
