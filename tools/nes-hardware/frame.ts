import type { RgbImage } from './png.ts';

/** Compare a native asset with the same top-left crop of an emulator frame. */
function compareFrame(expected: RgbImage, actual: RgbImage): { differingPixels: number; comparedPixels: number } {
    const { width, height, data } = expected;
    if (actual.width !== width || actual.height < height) {
        throw new Error('Emulator frame dimensions do not cover the expected asset');
    }
    if (data.length !== width * height * 3 || actual.data.length !== actual.width * actual.height * 3) {
        throw new Error('Invalid RGB frame length');
    }
    let differingPixels = 0;
    for (let p = 0; p < width * height; p++) {
        if ([0, 1, 2].some((channel) => data[p * 3 + channel] !== actual.data[p * 3 + channel])) {
            differingPixels++;
        }
    }
    return { differingPixels, comparedPixels: width * height };
}

export { compareFrame };
