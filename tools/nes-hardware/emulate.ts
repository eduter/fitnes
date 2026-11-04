import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import koffi from 'koffi';
import { checkConstruction } from './check.ts';
import { decodePng, encodePng } from './png.ts';
import { buildRom, type HardwareConstruction } from './rom.ts';
import { compareFrame } from './frame.ts';

/** Run a supplied FCEUmm libretro core and compare its native framebuffer with the expected asset. */
function main(): void {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        options: { out: { type: 'string', default: 'work/nes-emulator' }, frames: { type: 'string', default: '180' } },
    });
    const [constructionPath, imagePath, corePath] = positionals;
    if (!constructionPath || !imagePath || !corePath) {
        throw new Error('Usage: nes:emulate -- construction.json image.png core.so [--out DIR] [--frames 180]');
    }
    const frameCount = Number(values.frames);
    if (!Number.isInteger(frameCount) || frameCount < 2 || frameCount > 3600) {
        throw new Error('Frame count must be an integer from 2 to 3600');
    }
    const construction = JSON.parse(readFileSync(constructionPath, 'utf8')) as HardwareConstruction;
    const expected = decodePng(readFileSync(imagePath));
    const checkStart = performance.now();
    const proof = checkConstruction(construction, expected);
    const checkMs = performance.now() - checkStart;
    if (proof.status !== 'pass') {
        throw new Error(proof.problems.join('; '));
    }
    if (construction.displayPalette !== 'composite-direct-fbx') {
        throw new Error('The pinned emulator configuration supports Composite Direct only');
    }
    mkdirSync(values.out, { recursive: true });
    const rom = buildRom(construction);
    writeFileSync(join(values.out, 'frame.nes'), rom);
    const started = performance.now();
    const core = koffi.load(resolve(corePath));
    const Variable = koffi.struct('FitnesRetroVariable', { key: 'str', value: 'void *' });
    const Game = koffi.struct('FitnesRetroGame', { path: 'str', data: 'void *', size: 'size_t', meta: 'str' });
    const Env = koffi.proto('bool FitnesRetroEnv(unsigned int command, void *data)');
    const Video = koffi.proto(
        'void FitnesRetroVideo(const void *data, unsigned int width, unsigned int height, size_t pitch)'
    );
    const Audio = koffi.proto('void FitnesRetroAudio(int16_t left, int16_t right)');
    const Batch = koffi.proto('size_t FitnesRetroBatch(const void *data, size_t frames)');
    const Poll = koffi.proto('void FitnesRetroPoll(void)');
    const Input = koffi.proto(
        'int16_t FitnesRetroInput(unsigned int port, unsigned int device, unsigned int index, unsigned int id)'
    );
    const pointers: bigint[] = [];
    const callbacks: bigint[] = [];
    const options: Record<string, string> = {
        fceumm_palette: 'composite-direct-fbx',
        fceumm_region: 'NTSC',
        fceumm_nospritelimit: 'disabled',
        fceumm_overscan_h_left: '0',
        fceumm_overscan_h_right: '0',
        fceumm_overscan_v_top: '0',
        fceumm_overscan_v_bottom: '0',
        fceumm_ntsc_filter: 'disabled',
        fceumm_ramstate: 'fill $00',
    };
    function textPointer(value: string): bigint {
        const bytes = Buffer.from(`${value}\0`);
        const pointer = koffi.alloc('uint8_t', bytes.length) as bigint;
        koffi.encode(pointer, 'uint8_t', bytes, bytes.length);
        pointers.push(pointer);
        return pointer;
    }
    const optionPointers = Object.fromEntries(Object.entries(options).map(([key, value]) => [key, textPointer(value)]));
    const directory = textPointer(resolve(values.out));
    let currentFrame = 0,
        pixelFormat = 1,
        frame: Uint8Array | undefined,
        frameWidth = 0,
        frameHeight = 0,
        callbackError = '';
    function bind(name: string, type: ReturnType<typeof koffi.proto>, callback: (...args: never[]) => unknown): void {
        const pointer = koffi.register(callback, koffi.pointer(type));
        callbacks.push(pointer);
        core.func(name, 'void', [koffi.pointer(type)])(pointer);
    }
    const environment = (rawCommand: number, data: bigint | null): boolean => {
        const command = rawCommand & 0xffff;
        if (!data) {
            return false;
        }
        if (command === 15) {
            const variable = koffi.decode(data, Variable) as { key: string };
            const value = optionPointers[variable.key];
            if (!value) {
                return false;
            }
            koffi.encode(data, koffi.offsetof(Variable, 'value'), 'void *', value);
            return true;
        }
        if (command === 17) {
            koffi.encode(data, 'bool', false);
            return true;
        }
        if (command === 9 || command === 31) {
            koffi.encode(data, 'void *', directory);
            return true;
        }
        if (command === 52) {
            koffi.encode(data, 'unsigned int', 0);
            return true;
        }
        if (command === 10) {
            pixelFormat = koffi.decode(data, 'int') as number;
            if (pixelFormat !== 1) {
                callbackError = 'Core must support exact XRGB8888';
            }
            return pixelFormat === 1;
        }
        if (command === 3) {
            koffi.encode(data, 'bool', true);
            return true;
        }
        return [8, 11, 16, 18, 32, 35, 36, 37, 55, 69].includes(command);
    };
    const video = (data: bigint | null, width: number, height: number, pitch: number): void => {
        if (!data || currentFrame !== frameCount) {
            return;
        }
        if (pixelFormat !== 1 || width !== 256 || height !== 240) {
            callbackError = `Expected uncropped 256×240 XRGB8888, got ${width}×${height}`;
            return;
        }
        const bytes = koffi.decode(data, 'uint8_t', pitch * height) as Uint8Array;
        frame = new Uint8Array(width * height * 3);
        frameWidth = width;
        frameHeight = height;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const from = y * pitch + x * 4,
                    to = (y * width + x) * 3;
                frame[to] = bytes[from + 2];
                frame[to + 1] = bytes[from + 1];
                frame[to + 2] = bytes[from];
            }
        }
    };
    bind('retro_set_environment', Env, environment);
    bind('retro_set_video_refresh', Video, video);
    bind('retro_set_audio_sample', Audio, () => {});
    bind('retro_set_audio_sample_batch', Batch, (_data: bigint | null, frames: number) => frames);
    bind('retro_set_input_poll', Poll, () => {});
    bind('retro_set_input_state', Input, () => 0);
    const init = core.func('void retro_init(void)'),
        deinit = core.func('void retro_deinit(void)'),
        unload = core.func('void retro_unload_game(void)'),
        run = core.func('void retro_run(void)');
    const load = core.func('retro_load_game', 'bool', [koffi.pointer(Game)]);
    let initialized = false,
        loaded = false;
    try {
        init();
        initialized = true;
        loaded = load({ path: resolve(values.out, 'frame.nes'), data: rom, size: rom.length, meta: null }) as boolean;
        if (!loaded) {
            throw new Error(callbackError || 'The core could not load the generated Mapper 5 ROM');
        }
        for (currentFrame = 1; currentFrame <= frameCount; currentFrame++) {
            run();
        }
        if (callbackError) {
            throw new Error(callbackError);
        }
        if (!frame) {
            throw new Error('Core produced no final framebuffer');
        }
        writeFileSync(
            join(values.out, 'capture.png'),
            encodePng({ width: frameWidth, height: frameHeight, data: frame })
        );
        const { differingPixels, comparedPixels } = compareFrame(expected, {
            width: frameWidth,
            height: frameHeight,
            data: frame,
        });
        const report = {
            ...proof,
            status: differingPixels === 0 ? 'pass' : 'fail',
            frames: frameCount,
            differingPixels,
            comparedPixels,
            fastCheckMs: checkMs,
            emulatorMs: performance.now() - started,
            coreSha256: createHash('sha256').update(readFileSync(corePath)).digest('hex'),
            romSha256: createHash('sha256').update(rom).digest('hex'),
            imageSha256: createHash('sha256').update(readFileSync(imagePath)).digest('hex'),
            displayPalette: construction.displayPalette,
            emphasis: construction.emphasis,
        };
        writeFileSync(join(values.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = differingPixels === 0 ? 0 : 1;
    } finally {
        if (loaded) {
            unload();
        }
        if (initialized) {
            deinit();
        }
        for (const pointer of callbacks) {
            koffi.unregister(pointer);
        }
        for (const pointer of pointers) {
            koffi.free(pointer);
        }
        core.unload();
    }
}

try {
    main();
} catch (error) {
    console.error(JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 3;
}
