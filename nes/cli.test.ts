import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodePng } from './png.ts';

function run(args: string[]) {
    return spawnSync(process.execPath, ['--experimental-strip-types', 'nes/cli.ts', ...args], {
        cwd: process.cwd(),
        encoding: 'utf8',
    });
}

describe('nes cli', () => {
    it('exits 0 for a valid screen and 1 for an invalid one', () => {
        const ok = run(['validate', 'nes/fixtures/blank.json']);
        const bad = run(['validate', 'nes/fixtures/bad-width.json']);

        expect(ok.status).toBe(0);
        expect(ok.stdout).toContain('nes/fixtures/blank.json: valid');
        expect(bad.status).toBe(1);
        expect(bad.stderr).toContain('error screen-dimensions nes/fixtures/bad-width.json width:');
        expect(bad.stderr).toContain('invalid');
    });

    it('writes a native PNG for a valid screen and refuses an invalid one', () => {
        const directory = mkdtempSync(join(tmpdir(), 'nes-cli-'));
        const out = join(directory, 'blank.png');
        const preview = join(directory, 'blank-preview.png');
        const refused = join(directory, 'refused.png');

        const rendered = run(['render', 'nes/fixtures/blank.json', '--out', out, '--preview', preview]);
        const rejected = run(['render', 'nes/fixtures/bad-width.json', '--out', refused]);
        const scaled = run([
            'render',
            'nes/fixtures/blank.json',
            '--out',
            join(directory, 'again.png'),
            '--scale',
            '2',
        ]);

        expect(rendered.status).toBe(0);
        expect(scaled.status).toBe(0);
        expect(decodePng(readFileSync(out))).toMatchObject({ width: 256, height: 240 });
        expect(decodePng(readFileSync(preview))).toMatchObject({ width: 512, height: 480 });
        expect(rejected.status).toBe(1);
        expect(() => readFileSync(refused)).toThrow();
        expect(decodePng(readFileSync(join(directory, 'again.png')))).toMatchObject({ width: 512, height: 480 });

        rmSync(directory, { recursive: true });
    });

    it('writes identical bytes when the same screen is rendered twice', () => {
        const directory = mkdtempSync(join(tmpdir(), 'nes-cli-'));
        const first = join(directory, 'a.png');
        const second = join(directory, 'b.png');

        expect(run(['render', 'nes/fixtures/blank.json', '--out', first]).status).toBe(0);
        expect(run(['render', 'nes/fixtures/blank.json', '--out', second]).status).toBe(0);
        expect(readFileSync(first)).toEqual(readFileSync(second));

        rmSync(directory, { recursive: true });
    });
});
