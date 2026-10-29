import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { encodePng } from './png.ts';

it('uses machine-readable reports and exit codes for PNG batches', () => {
    const directory = mkdtempSync(join(tmpdir(), 'nes-cli-'));
    try {
        const good = join(directory, 'good.png');
        const bad = join(directory, 'bad.png');
        const data = new Uint8Array(256 * 240 * 3);
        writeFileSync(good, encodePng({ width: 256, height: 240, data }));
        data.set([1, 2, 3], 0);
        writeFileSync(bad, encodePng({ width: 256, height: 240, data }));
        const run = (...args: string[]) =>
            spawnSync(process.execPath, ['tools/nes/cli.ts', ...args, '--out', join(directory, 'reports')], {
                encoding: 'utf8',
                timeout: 20_000,
            });
        const pass = run(good);
        expect(pass.status, pass.stderr).toBe(0);
        expect(JSON.parse(pass.stdout)[0].status).toBe('pass');
        const fail = run(good, bad);
        expect(fail.status, fail.stderr).toBe(1);
        expect(JSON.parse(fail.stdout).map((report: { status: string }) => report.status)).toEqual(['pass', 'fail']);
        expect(JSON.parse(readFileSync(join(directory, 'reports', '2-bad.json'), 'utf8')).problems[0].code).toBe(
            'off-palette'
        );
        const unproven = join(directory, 'unproven.png');
        const busy = new Uint8Array(256 * 16 * 3);
        const colors = [
            [0, 0, 0],
            [116, 116, 116],
            [36, 24, 140],
            [0, 0, 168],
        ];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 144; x++) {
                busy.set(colors[(x % 2) + (y % 2) * 2], (y * 256 + x) * 3);
            }
        }
        for (let dot = 0; dot < 9; dot++) {
            busy.set([188, 188, 188], dot * 16 * 3);
        }
        writeFileSync(unproven, encodePng({ width: 256, height: 16, data: busy }));
        const unknown = run(unproven);
        expect(unknown.status, unknown.stderr).toBe(2);
        expect(JSON.parse(unknown.stdout)[0].status).toBe('inconclusive');
        expect(run('--scale', '1.5', good).status).toBe(3);
        expect(run('--url', 'file:///etc/passwd').status).toBe(3);
        expect(run().status).toBe(3);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
