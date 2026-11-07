/** A native-pixel rectangle with inclusive origin and positive dimensions. */
interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** An exact, independent rectangle of indexed pixels held in the editor clipboard. */
interface PixelPatch {
    width: number;
    height: number;
    pixels: Uint8Array;
}

/** Copy a rectangle without retaining a mutable reference to the source image. */
function copyRegion(pixels: Uint8Array, width: number, region: Region): PixelPatch {
    const { left, top, width: columns, height: rows } = region;
    if (
        !Number.isInteger(left) ||
        !Number.isInteger(top) ||
        !Number.isInteger(columns) ||
        !Number.isInteger(rows) ||
        left < 0 ||
        top < 0 ||
        columns < 1 ||
        rows < 1 ||
        left + columns > width ||
        top + rows > pixels.length / width
    ) {
        throw new Error('Copy selection must fit inside the image');
    }
    const copy = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++) {
        copy.set(pixels.subarray((top + y) * width + left, (top + y) * width + left + columns), y * columns);
    }
    return { width: columns, height: rows, pixels: copy };
}

/** Paste opaque indexed pixels exactly, clipping at the image boundary without wrapping. */
function pasteRegion(pixels: Uint8Array, width: number, patch: PixelPatch, left: number, top: number): Uint8Array {
    const { width: columns, height: rows, pixels: source } = patch;
    const result = pixels.slice();
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const tx = left + x;
            const ty = top + y;
            if (tx >= 0 && tx < width && ty >= 0 && ty < pixels.length / width) {
                result[ty * width + tx] = source[y * columns + x];
            }
        }
    }
    return result;
}

/** Fill one four-connected exact-color region without changing the input. */
function floodFill(pixels: Uint8Array, width: number, x: number, y: number, replacement: number): Uint8Array {
    const height = pixels.length / width;
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return pixels;
    }
    const start = y * width + x;
    const source = pixels[start];
    if (source === replacement) {
        return pixels;
    }
    const result = pixels.slice();
    const queue = new Uint32Array(pixels.length);
    let head = 0;
    let tail = 1;
    queue[0] = start;
    result[start] = replacement;
    while (head < tail) {
        const p = queue[head++];
        for (const next of [
            p % width > 0 ? p - 1 : -1,
            p % width < width - 1 ? p + 1 : -1,
            p >= width ? p - width : -1,
            p < pixels.length - width ? p + width : -1,
        ]) {
            if (next >= 0 && result[next] === source) {
                result[next] = replacement;
                queue[tail++] = next;
            }
        }
    }
    return result;
}

/** Replace matching pixels only inside the selected rectangle, leaving all other pixels exact. */
function replaceRegion(
    pixels: Uint8Array,
    width: number,
    region: Region,
    source: number,
    replacement: number
): Uint8Array {
    const { left, top, width: columns, height: rows } = region;
    const result = pixels.slice();
    for (let y = Math.max(0, top); y < Math.min(pixels.length / width, top + rows); y++) {
        for (let x = Math.max(0, left); x < Math.min(width, left + columns); x++) {
            if (result[y * width + x] === source) {
                result[y * width + x] = replacement;
            }
        }
    }
    return result;
}

/** Draw a one-pixel-wide line without gaps between sampled pointer positions. */
function paintLine(
    pixels: Uint8Array,
    width: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: number
): Uint8Array {
    const result = pixels.slice();
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
        if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < pixels.length / width) {
            result[y0 * width + x0] = color;
        }
        if (x0 === x1 && y0 === y1) {
            break;
        }
        const twice = error * 2;
        if (twice >= dy) {
            error += dy;
            x0 += sx;
        }
        if (twice <= dx) {
            error += dx;
            y0 += sy;
        }
    }
    return result;
}

/** Whole-action immutable undo/redo history, bounded to 100 edits. */
class EditHistory {
    private entries: { pixels: Uint8Array; label: string }[];
    private cursor = 0;
    constructor(pixels: Uint8Array) {
        this.entries = [{ pixels: pixels.slice(), label: 'Starting image' }];
    }
    get pixels(): Uint8Array {
        return this.entries[this.cursor].pixels.slice();
    }
    get canUndo(): boolean {
        return this.cursor > 0;
    }
    get canRedo(): boolean {
        return this.cursor < this.entries.length - 1;
    }
    get undoLabel(): string {
        return this.entries[this.cursor].label;
    }
    commit(pixels: Uint8Array, label: string): boolean {
        const current = this.entries[this.cursor].pixels;
        if (pixels.length !== current.length) {
            throw new Error('An edit cannot change image dimensions');
        }
        if (pixels.every((v, i) => v === current[i])) {
            return false;
        }
        this.entries.splice(this.cursor + 1);
        this.entries.push({ pixels: pixels.slice(), label });
        if (this.entries.length > 101) {
            this.entries.shift();
        }
        this.cursor = this.entries.length - 1;
        return true;
    }
    undo(): Uint8Array {
        if (this.canUndo) {
            this.cursor--;
        }
        return this.pixels;
    }
    redo(): Uint8Array {
        if (this.canRedo) {
            this.cursor++;
        }
        return this.pixels;
    }
}

export type { PixelPatch, Region };
export { copyRegion, EditHistory, floodFill, paintLine, pasteRegion, replaceRegion };
