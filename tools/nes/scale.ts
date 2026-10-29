import type { RgbImage } from './png.ts';

/** Recover native pixels only if every block is an exact integer enlargement. */
function nativePixels(image: RgbImage, scale: number): RgbImage {
    const { width, height, data } = image;
    if (
        !Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height) ||
        width < 1 ||
        height < 1 ||
        data.length !== width * height * 3
    ) {
        throw new Error('Invalid RGB image dimensions or buffer length');
    }
    if (!Number.isSafeInteger(scale) || scale < 1) {
        throw new Error(`Scale must be a positive integer; got ${scale}`);
    }
    if (width % scale !== 0 || height % scale !== 0) {
        throw new Error(`Image ${width}×${height} is not divisible by scale ${scale}`);
    }
    const nativeWidth = width / scale;
    const nativeHeight = height / scale;
    const native = new Uint8Array(nativeWidth * nativeHeight * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const target = (Math.floor(y / scale) * nativeWidth + Math.floor(x / scale)) * 3;
            const source = (y * width + x) * 3;
            const origin = (Math.floor(y / scale) * scale * width + Math.floor(x / scale) * scale) * 3;
            for (let channel = 0; channel < 3; channel++) {
                if (data[source + channel] !== data[origin + channel]) {
                    throw new Error(
                        `Blended or non-integer scaling at (${x},${y}); expected exact ${scale}×${scale} blocks`
                    );
                }
                native[target + channel] = data[source + channel];
            }
        }
    }
    return { width: nativeWidth, height: nativeHeight, data: native };
}

export { nativePixels };
