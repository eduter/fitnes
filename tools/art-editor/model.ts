/** A native-pixel rectangle with inclusive origin and positive dimensions. */
interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
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

export type { Region };
export { EditHistory, floodFill, replaceRegion };
