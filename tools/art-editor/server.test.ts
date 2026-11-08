import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { EditorConfig, VerificationResult } from './protocol.ts';
import { createEditorServer, decodePixels } from './server.ts';

let root: string;
let server: Server;
let origin: string;
beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'fitnes-art-editor-'));
    mkdirSync(join(root, 'art/home'), { recursive: true });
    for (const file of ['gym.png', 'construction.json']) {
        cpSync(`art/home/${file}`, join(root, 'art/home', file));
    }
    mkdirSync(join(root, 'art/logo'), { recursive: true });
    for (const file of ['logo.png', 'construction.json']) {
        cpSync(`art/logo/${file}`, join(root, 'art/logo', file));
    }
    mkdirSync(join(root, 'src/styles'), { recursive: true });
    cpSync('src/styles/frame.png', join(root, 'src/styles/frame.png'));
    server = createEditorServer(root, join(root, 'missing-core.so'));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Editor test did not bind TCP');
    }
    origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
    await new Promise<void>((done) => server.close(() => done()));
    rmSync(root, { recursive: true, force: true });
});

it('requires the local token and rejects cross-origin edits', async () => {
    const config = (await (await fetch(`${origin}/api/config`)).json()) as EditorConfig;
    const body = JSON.stringify({ revision: config.revision + 1, pixels: config.pixels });
    expect(
        (await fetch(`${origin}/api/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }))
            .status
    ).toBe(403);
    expect(
        (
            await fetch(`${origin}/api/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Editor-Token': config.token,
                    Origin: 'https://example.com',
                },
                body,
            })
        ).status
    ).toBe(403);
});

it('does not turn an exact layout green or export it when the emulator is unavailable', async () => {
    const config = (await (await fetch(`${origin}/api/config`)).json()) as EditorConfig;
    const result = (await (
        await fetch(`${origin}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token },
            body: JSON.stringify({ revision: config.revision, pixels: config.pixels }),
        })
    ).json()) as VerificationResult;
    expect(result.status).toBe('emulator-unavailable');
    expect((await fetch(`${origin}/api/export?revision=${config.revision}`)).status).toBe(409);
    expect(
        (
            await fetch(`${origin}/api/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Editor-Token': config.token },
                body: JSON.stringify({ revision: config.revision }),
            })
        ).status
    ).toBe(409);
});

it('rejects older revisions without overwriting the newer saved draft', async () => {
    const config = (await (await fetch(`${origin}/api/config`)).json()) as EditorConfig;
    const edited = Buffer.from(config.pixels, 'base64');
    edited[0] = 32;
    const headers = { 'Content-Type': 'application/json', 'X-Editor-Token': config.token };
    await fetch(`${origin}/api/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ revision: config.revision + 1, pixels: edited.toString('base64') }),
    });
    const stale = await fetch(`${origin}/api/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ revision: config.revision, pixels: config.pixels }),
    });
    expect(stale.status).toBe(409);
    expect(JSON.parse(readFileSync(join(root, 'work/art-editor/draft.json'), 'utf8')).pixels).toBe(
        edited.toString('base64')
    );
});

it('rejects malformed and out-of-palette pixel buffers', () => {
    expect(() => decodePixels('AAAA')).toThrow('51,200');
    expect(() => decodePixels(Buffer.alloc(51200, 64).toString('base64'))).toThrow('six-bit');
});

it('isolates logo and border dimensions, tokens, revisions and drafts from the home image', async () => {
    const home = (await (await fetch(`${origin}/api/config`)).json()) as EditorConfig;
    const logo = (await (await fetch(`${origin}/api/config?asset=logo`)).json()) as EditorConfig;
    const border = (await (await fetch(`${origin}/api/config?asset=src%2Fstyles%2Fframe.png`)).json()) as EditorConfig;
    expect([logo.width, logo.height]).toEqual([256, 120]);
    expect([border.width, border.height]).toEqual([12, 12]);
    expect(logo.token).not.toBe(home.token);
    const changed = Buffer.from(logo.pixels, 'base64');
    changed[0] = 32;
    await fetch(`${origin}/api/verify?asset=logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Editor-Token': logo.token },
        body: JSON.stringify({ revision: logo.revision + 1, pixels: changed.toString('base64') }),
    });
    const after = (await (await fetch(`${origin}/api/config`)).json()) as EditorConfig;
    expect(after.pixels).toBe(home.pixels);
    expect(after.revision).toBe(home.revision);
    expect((await fetch(`${origin}/api/config?asset=..%2F..%2Fetc%2Fpasswd`)).status).toBe(404);
});
