import { readFileSync } from 'node:fs';
import { decodePng, type RgbImage } from './nes-hardware/png.ts';

/** Check a native, cropped panel screenshot against the canonical corner art and uniform edge profiles. */
function main(): void {
    const paths = process.argv.slice(2);
    if (!paths.length) {
        throw new Error('Usage: node tools/verify-steel-panel-capture.ts panel-capture.png [...]');
    }
    const source = decodePng(readFileSync('src/components/SteelPanel/steel-panel.png'));
    for (const path of paths) {
        const capture = decodePng(readFileSync(path));
        const pixels = verify(capture, source);
        console.log(
            JSON.stringify({
                path,
                width: capture.width,
                height: capture.height,
                verifiedFramePixels: pixels,
                status: 'pass',
            })
        );
    }
}

/** Ignore page content while checking every surround, corner and straight-edge pixel. */
function verify(capture: RgbImage, source: RgbImage): number {
    const { width, height, data } = capture;
    if (width < 20 || height < 20) {
        throw new Error('Panel captures must be at least 20×20 native pixels');
    }
    let checked = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const fx = x - 2;
            const fy = y - 2;
            const w = width - 4;
            const h = height - 4;
            let expected: readonly number[];
            if (fx < 0 || fy < 0 || fx >= w || fy >= h) {
                expected = [0, 0, 0];
            } else {
                let sx: number;
                let sy: number;
                if (fy < 8) {
                    sy = fy;
                    sx = fx < 8 ? fx : fx >= w - 8 ? 10 + fx - (w - 8) : 8 + ((fx - 8) % 2);
                } else if (fy >= h - 8) {
                    sy = 10 + fy - (h - 8);
                    sx = fx < 8 ? fx : fx >= w - 8 ? 10 + fx - (w - 8) : 8 + ((fx - 8) % 2);
                } else if (fx < 8) {
                    sx = fx;
                    sy = 8 + ((fy - 8) % 2);
                } else if (fx >= w - 8) {
                    sx = 10 + fx - (w - 8);
                    sy = 8 + ((fy - 8) % 2);
                } else {
                    continue;
                }
                const offset = (sy * source.width + sx) * 3;
                expected = Array.from(source.data.subarray(offset, offset + 3));
            }
            const offset = (y * width + x) * 3;
            if (!expected.every((channel, i) => channel === data[offset + i])) {
                throw new Error(
                    `Frame mismatch at (${x}, ${y}): expected ${expected.join(',')}, got ${Array.from(data.subarray(offset, offset + 3)).join(',')}`
                );
            }
            checked++;
        }
    }
    return checked;
}

main();
