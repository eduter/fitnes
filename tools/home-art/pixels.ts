import type { RgbImage } from '../nes-hardware/png.ts';

/** Enlarge an asset by exact integer replication, without adding colors or detail. */
function enlarge(source: RgbImage, scale: number): RgbImage {
    const { width, height, data } = source;
    const output = new Uint8Array(width * height * scale * scale * 3);
    for (let y = 0; y < height * scale; y++) {
        for (let x = 0; x < width * scale; x++) {
            const offset = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 3;
            output.set(data.subarray(offset, offset + 3), (y * width * scale + x) * 3);
        }
    }
    return { width: width * scale, height: height * scale, data: output };
}

export { enlarge };
