/** A native frame expressed in actual PPU palette slots and optional 8×8 sprites. */
interface HardwareConstruction {
    profile: 'stock' | 'mmc5-exattr';
    displayPalette: string;
    emphasis: number;
    width: number;
    height: number;
    regionSize: number;
    palettes: number[][];
    attributes: number[];
    backgroundPixels: string;
    spriteMode?: number;
    spritePalettes?: number[][];
    sprites?: { x: number; y: number; palette: number; pixels: string }[];
}

/** Build a Mapper 5 proof ROM from a construction already accepted by the fast verifier. */
function buildRom(m: HardwareConstruction): Uint8Array {
    const { width, height, regionSize } = m;
    if (width !== 256 || height < 1 || height > 240) {
        throw new Error('ROM requires a native 256×1–240 frame');
    }
    if (regionSize !== 8 && regionSize !== 16) {
        throw new Error('ROM supports 8px and 16px attributes');
    }
    if ((m.sprites?.length ?? 0) > 64) {
        throw new Error('OAM exceeds 64 sprites');
    }
    // Share patterns while keeping each tile's MMC5 palette and CHR-bank selection
    const pixels = Buffer.from(m.backgroundPixels, 'base64'),
        patterns: number[][] = [],
        patternMap = new Map<string, number>();
    const nt = new Uint8Array(1024),
        ex = new Uint8Array(1024);
    for (let ty = 0; ty < 30; ty++) {
        for (let tx = 0; tx < 32; tx++) {
            const bytes = new Uint8Array(16);
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const v = ty * 8 + y < m.height ? pixels[(ty * 8 + y) * 256 + tx * 8 + x] : 0;
                    bytes[y] |= (v & 1) << (7 - x);
                    bytes[y + 8] |= ((v >> 1) & 1) << (7 - x);
                }
            }
            const key = Buffer.from(bytes).toString('hex');
            let index = patternMap.get(key);
            if (index === undefined) {
                index = patterns.length;
                patterns.push([...bytes]);
                patternMap.set(key, index);
            }
            const loc = ty * 32 + tx;
            nt[loc] = index % 256;
            ex[loc] =
                ((ty * 8 < m.height
                    ? m.attributes[
                          Math.floor((ty * 8) / m.regionSize) * (256 / m.regionSize) +
                              Math.floor((tx * 8) / m.regionSize)
                      ]
                    : 0) <<
                    6) |
                Math.floor(index / 256);
        }
    }
    const bgLength = Math.ceil((patterns.length * 16) / 8192) * 8192;
    const chrLength = 2 ** Math.ceil(Math.log2(bgLength + 8192)),
        chr = Buffer.alloc(chrLength);
    patterns.forEach((p, i) => {
        chr.set(p, i * 16);
    });
    const oam = Buffer.alloc(256, 255);
    for (const [i, sprite] of (m.sprites ?? []).entries()) {
        const px = Buffer.from(sprite.pixels, 'base64');
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const v = px[y * 8 + x];
                chr[bgLength + i * 16 + y] |= (v & 1) << (7 - x);
                chr[bgLength + i * 16 + y + 8] |= ((v >> 1) & 1) << (7 - x);
            }
        }
        oam.set([sprite.y - 1, i, sprite.palette, sprite.x], i * 4);
    }
    // Keep data in fixed PRG banks so the startup code can copy it directly
    const prg = Buffer.alloc(32768, 0xff);
    const palette = Buffer.from([
        ...Array.from({ length: 4 }, (_, i) => m.palettes[i] ?? Array(4).fill(m.palettes[0][0])).flat(),
        ...(m.spritePalettes ?? []).flat(),
        ...Array(16 - (m.spritePalettes ?? []).length * 4).fill(15),
    ]);
    prg.set(palette, 0);
    prg.set(nt, 0x100);
    prg.set(ex, 0x500);
    prg.set(oam, 0x900);
    const code: number[] = [],
        labels = new Map<string, number>(),
        refs: { at: number; label: string; relative: boolean }[] = [];
    function emit(...b: number[]) {
        code.push(...b);
    }
    function label(s: string) {
        labels.set(s, 0xe000 + code.length);
    }
    function branch(op: number, s: string) {
        emit(op, 0);
        refs.push({ at: code.length - 1, label: s, relative: true });
    }
    function jump(op: number, s: string) {
        emit(op, 0, 0);
        refs.push({ at: code.length - 2, label: s, relative: false });
    }
    function write(addr: number, value: number) {
        emit(0xa9, value, 0x8d, addr & 255, addr >> 8);
    }
    // Disable interrupts and rendering, then wait for the PPU to become writable
    label('reset');
    emit(
        0x78,
        0xd8,
        0xa2,
        0x40,
        0x8e,
        0x17,
        0x40,
        0xa2,
        0xff,
        0x9a,
        0xe8,
        0x8e,
        0x00,
        0x20,
        0x8e,
        0x01,
        0x20,
        0x8e,
        0x10,
        0x40,
        0x2c,
        0x02,
        0x20
    );
    for (let i = 0; i < 2; i++) {
        label(`wait${i}`);
        emit(0x2c, 0x02, 0x20);
        branch(0x10, `wait${i}`);
    }
    // Configure fixed PRG banks, sprite CHR banks and extended background attributes
    write(0x5100, 3);
    for (let i = 0; i < 4; i++) {
        write(0x5114 + i, 0x80 + i);
    }
    write(0x5101, 3);
    for (let i = 0; i < 8; i++) {
        write(0x5120 + i, bgLength / 1024 + i);
    }
    write(0x5105, 0);
    write(0x5130, 0);
    write(0x5104, 2);
    for (let page = 0; page < 4; page++) {
        emit(0xa2, 0);
        label(`ex${page}`);
        emit(0xbd, 0x00, 0x85 + page, 0x9d, 0x00, 0x5c + page, 0xe8);
        branch(0xd0, `ex${page}`);
    }
    write(0x5104, 1);
    // Upload palette RAM and the nametable with rendering still disabled
    emit(0x2c, 0x02, 0x20);
    write(0x2006, 0x3f);
    write(0x2006, 0);
    emit(0xa2, 0);
    label('palette');
    emit(0xbd, 0, 0x80, 0x8d, 7, 0x20, 0xe8, 0xe0, 32);
    branch(0xd0, 'palette');
    emit(0x2c, 2, 0x20);
    write(0x2006, 0x20);
    write(0x2006, 0);
    for (let page = 0; page < 4; page++) {
        emit(0xa2, 0);
        label(`nt${page}`);
        emit(0xbd, 0x00, 0x81 + page, 0x8d, 7, 0x20, 0xe8);
        branch(0xd0, `nt${page}`);
    }
    emit(0x2c, 2, 0x20);
    write(0x2006, 0);
    write(0x2006, 0);
    write(0x2005, 0);
    write(0x2005, 0);
    // DMA all OAM entries, then enable the static frame with its declared emphasis
    write(0x2003, 0);
    write(0x4014, 0x89);
    write(0x2000, 0);
    write(0x2001, 0x1e | (m.emphasis << 5));
    label('hang');
    jump(0x4c, 'hang');
    label('interrupt');
    emit(0x40);
    // Resolve the small assembler's labels after every address is known
    for (const r of refs) {
        const target = address(r.label);
        if (r.relative) {
            const delta = target - (0xe000 + r.at + 1);
            if (delta < -128 || delta > 127) {
                throw new Error('branch range');
            }
            code[r.at] = delta & 255;
        } else {
            code[r.at] = target & 255;
            code[r.at + 1] = target >> 8;
        }
    }
    prg.set(code, 0x6000);
    for (const [offset, name] of [
        [0x7ffa, 'interrupt'],
        [0x7ffc, 'reset'],
        [0x7ffe, 'interrupt'],
    ] as const) {
        const target = address(name);
        prg[offset] = target & 255;
        prg[offset + 1] = target >> 8;
    }
    const header = Buffer.from([0x4e, 0x45, 0x53, 0x1a, 2, chrLength / 8192, 0x50, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    return Buffer.concat([header, prg, chr]);

    function address(name: string): number {
        const target = labels.get(name);
        if (target === undefined) {
            throw new Error(`Undefined ROM label '${name}'`);
        }
        return target;
    }
}
export { buildRom };
export type { HardwareConstruction };
