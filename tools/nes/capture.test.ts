import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { capturePage } from './capture.ts';
import { checkPicture } from './check.ts';
import { decodePng } from './png.ts';

const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    const color = request.url === '/bad' ? '#010203' : '#000';
    const width = request.url === '/overflow' ? 300 : 256;
    response.end(
        `<style>html,body{margin:0;background:#000}main{width:${width}px;height:497px;background:${color}}i{display:block;height:50vh;background:#fcfcfc}</style><main><i></i></main><script>setTimeout(()=>document.body.dataset.ready='yes',50)</script>`
    );
});
let origin = '';

beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('No HTTP listener');
    }
    origin = `http://127.0.0.1:${address.port}`;
});
afterAll(() => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

describe('real Chrome capture', () => {
    it('captures scroll content without resizing viewport-dependent layout', async () => {
        const image = decodePng(await capturePage(origin, 'body[data-ready="yes"]'));
        expect(image.width).toBe(256);
        expect(image.height).toBe(497);
        expect(Array.from(image.data.subarray(119 * 256 * 3, 119 * 256 * 3 + 3))).toEqual([252, 252, 252]);
        expect(Array.from(image.data.subarray(120 * 256 * 3, 120 * 256 * 3 + 3))).toEqual([0, 0, 0]);
        expect(checkPicture(image).status).toBe('pass');
    }, 30_000);

    it('keeps off-palette pixels instead of converting them to a legal palette', async () => {
        const image = decodePng(await capturePage(`${origin}/bad`));
        expect(checkPicture(image).status).toBe('fail');
    }, 30_000);

    it('refuses to silently crop horizontal overflow', async () => {
        await expect(capturePage(`${origin}/overflow`)).rejects.toThrow('content width 300');
    }, 30_000);
});
