import type { RgbImage } from './nes-hardware/png.ts';

const crop = { left: 83, top: 65, size: 90 };
const intensity = 0.8;
const maskOpacity = Math.sqrt(intensity) * 0.9;
const samples = 8;

/** Bake the adopted 80% rounded-pixel mask into the approved opaque launcher crop. */
function renderPwaIcon(hero: RgbImage, size: number): RgbImage {
    if (!Number.isInteger(size) || size < 1) {
        throw new Error(`PWA icon size must be a positive integer, got ${size}`);
    }
    if (crop.left + crop.size > hero.width || crop.top + crop.size > hero.height) {
        throw new Error('Approved PWA crop extends outside the supplied hero artwork');
    }

    // Integrate the mask at output resolution so small icons do not alias the dot grid
    const data = new Uint8Array(size * size * 3);
    const step = crop.size / size;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let red = 0;
            let green = 0;
            let blue = 0;
            for (let sy = 0; sy < samples; sy++) {
                const logicalY = (y + (sy + 0.5) / samples) * step;
                const sourceY = crop.top + Math.floor(logicalY);
                const v = logicalY % 1;
                const scanline = Math.max(0, (v - 0.65) / 0.35) * intensity * 0.15;
                for (let sx = 0; sx < samples; sx++) {
                    const logicalX = (x + (sx + 0.5) / samples) * step;
                    const sourceX = crop.left + Math.floor(logicalX);
                    const u = logicalX % 1;
                    const radius = Math.hypot((u - 0.5) / 0.65, (v - 0.5) / 0.65);
                    const spot = Math.max(0, Math.min(1, (radius - 0.38) / (0.85 - 0.38)));
                    const transmission = (1 - spot * maskOpacity) * (1 - scanline);
                    const source = (sourceY * hero.width + sourceX) * 3;
                    red += hero.data[source] * transmission;
                    green += hero.data[source + 1] * transmission;
                    blue += hero.data[source + 2] * transmission;
                }
            }
            const target = (y * size + x) * 3;
            data[target] = Math.round(red / samples ** 2);
            data[target + 1] = Math.round(green / samples ** 2);
            data[target + 2] = Math.round(blue / samples ** 2);
        }
    }
    return { width: size, height: size, data };
}

export { renderPwaIcon };
