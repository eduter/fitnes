import { deflateSync, inflateSync } from 'node:zlib';

/** A packed 8-bit RGB image, three bytes per pixel, rows top to bottom. */
interface RgbImage {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8Array;
}

const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = crcTable();

/**
 * Encode an RGB image as a PNG. The file carries no timestamp, gamma, or
 * text chunks, so identical pixels produce identical bytes on a given zlib.
 */
function encodePng(image: RgbImage): Uint8Array {
    const { width, height, data } = image;

    if (data.length !== width * height * 3) {
        throw new Error(`png: expected ${width * height * 3} RGB bytes for ${width}×${height}, got ${data.length}`);
    }

    // Filter type 0 on every scanline keeps the encoder trivial and exact
    const stride = width * 3;
    const raw = new Uint8Array((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
    }

    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    header[8] = 8;
    header[9] = 2;

    return concat([
        SIGNATURE,
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', new Uint8Array(0)),
    ]);
}

/**
 * Decode a PNG written by `encodePng`: 8-bit RGB, no interlace. Other filter
 * types are supported so a re-saved file still compares, but palette, alpha,
 * and 16-bit images are rejected.
 */
function decodePng(bytes: Uint8Array): RgbImage {
    if (!SIGNATURE.every((value, index) => bytes[index] === value)) {
        throw new Error('png: missing PNG signature');
    }

    // Collect the header and the compressed stream
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = SIGNATURE.length;
    let width = 0;
    let height = 0;
    const idat: Uint8Array[] = [];
    while (offset < bytes.length) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
        const body = bytes.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            width = view.getUint32(offset + 8);
            height = view.getUint32(offset + 12);
            if (body[8] !== 8 || body[9] !== 2 || body[12] !== 0) {
                throw new Error('png: only 8-bit RGB non-interlaced images are supported');
            }
        }
        if (type === 'IDAT') {
            idat.push(body);
        }
        offset += length + 12;
    }

    // Undo scanline filters
    const raw = inflateSync(concat(idat));
    const stride = width * 3;
    const data = new Uint8Array(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const left = x >= 3 ? data[y * stride + x - 3] : 0;
            const up = y > 0 ? data[(y - 1) * stride + x] : 0;
            const upLeft = x >= 3 && y > 0 ? data[(y - 1) * stride + x - 3] : 0;
            data[y * stride + x] = (line[x] + predict(filter, left, up, upLeft)) & 0xff;
        }
    }

    return { width, height, data };
}

/** Enlarge an image by an integer factor with nearest-neighbor sampling. */
function scaleNearest(image: RgbImage, factor: number): RgbImage {
    if (!Number.isInteger(factor) || factor < 1) {
        throw new Error(`png: scale must be a positive integer, got ${factor}`);
    }

    const width = image.width * factor;
    const height = image.height * factor;
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        const sourceRow = Math.floor(y / factor) * image.width;
        for (let x = 0; x < width; x++) {
            const source = (sourceRow + Math.floor(x / factor)) * 3;
            data.set(image.data.subarray(source, source + 3), (y * width + x) * 3);
        }
    }

    return { width, height, data };
}

function predict(filter: number, left: number, up: number, upLeft: number): number {
    switch (filter) {
        case 0:
            return 0;
        case 1:
            return left;
        case 2:
            return up;
        case 3:
            return Math.floor((left + up) / 2);
        case 4: {
            const estimate = left + up - upLeft;
            const toLeft = Math.abs(estimate - left);
            const toUp = Math.abs(estimate - up);
            const toUpLeft = Math.abs(estimate - upLeft);
            if (toLeft <= toUp && toLeft <= toUpLeft) {
                return left;
            }
            return toUp <= toUpLeft ? up : upLeft;
        }
        default:
            throw new Error(`png: unknown filter type ${filter}`);
    }
}

function chunk(type: string, body: Uint8Array): Uint8Array {
    const out = new Uint8Array(body.length + 12);
    const view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) {
        out[4 + i] = type.charCodeAt(i);
    }
    out.set(body, 8);
    view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
    return out;
}

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function crcTable(): Uint32Array {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

export { decodePng, encodePng, scaleNearest };
export type { RgbImage };
