import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { masterPalette } from './palette.ts';
import { assessPicture } from './pictureCheck.ts';
import { decodePng, type RgbImage } from './png.ts';

const PORT = 5199;
const PAGES = ['/', '/templates', '/exercises', '/bodyweight', '/sessions', '/data'];

/**
 * Open the real app at 256 CSS pixels, where one logical pixel is one screenshot
 * pixel, and score each shell page as a background with a sprite layer on top.
 */
describe('rendered pages', () => {
    it('stay inside the NES picture limits', async () => {
        const palette = masterPalette();
        const failures: string[] = [];

        await withApp(async (origin, page) => {
            for (const path of PAGES) {
                const picture = await capture(page, `${origin}${path}`);
                const problems = assessPicture(picture, palette, { patternLimit: false });
                if (problems.length > 0) {
                    failures.push(`${path}\n${problems.map((problem) => problem.message).join('\n')}`);
                }
            }
        });

        expect(failures, failures.join('\n\n')).toEqual([]);
    }, 90_000);
});

async function withApp(run: (origin: string, page: Cdp) => Promise<void>): Promise<void> {
    const chromePath = findChrome();
    const profile = mkdtempSync(join(tmpdir(), 'fitnes-page-'));
    const server = spawn(
        process.execPath,
        ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const chrome = spawn(
        chromePath,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            '--font-render-hinting=none',
            '--disable-font-subpixel-positioning',
            '--disable-lcd-text',
            '--force-device-scale-factor=1',
            '--remote-debugging-port=9224',
            `--user-data-dir=${profile}`,
            '--window-size=256,480',
        ],
        { stdio: 'ignore' }
    );

    try {
        await waitFor(`http://127.0.0.1:${PORT}/`, server);
        const browser = await connect('http://127.0.0.1:9224/json/version');
        const created = await browser.send('Target.createTarget', { url: 'about:blank' });
        const targets = (await (await fetch('http://127.0.0.1:9224/json/list')).json()) as {
            id: string;
            webSocketDebuggerUrl: string;
        }[];
        const target = targets.find((candidate) => candidate.id === created.targetId);
        if (target === undefined) {
            throw new Error('chrome did not open a page target');
        }
        const page = await connect(target.webSocketDebuggerUrl);
        await page.send('Page.enable');
        await page.send('Runtime.enable');
        await run(`http://127.0.0.1:${PORT}`, page);
    } finally {
        chrome.kill();
        server.kill();
        await sleep(300);
        try {
            rmSync(profile, { recursive: true, force: true });
        } catch {
            // Chrome can still be releasing the profile after the signal
        }
    }
}

/** Screenshot the document at one CSS pixel per logical pixel, padded to whole attribute rows. */
async function capture(page: Cdp, url: string): Promise<RgbImage> {
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 256,
        height: 480,
        deviceScaleFactor: 1,
        mobile: true,
    });
    await page.send('Page.navigate', { url });
    await page.send('Runtime.evaluate', {
        expression: `new Promise((resolve) => {
            const start = Date.now();
            const tick = () => {
                const ready = document.fonts.check('8px "FitNES HUD"') && document.querySelector('.app-tabs');
                if (ready || Date.now() - start > 4000) resolve(true);
                else requestAnimationFrame(tick);
            };
            tick();
        })`,
        awaitPromise: true,
    });
    const measured = await page.send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollHeight',
        returnByValue: true,
    });
    const measuredHeight = Number(measured.result?.value ?? 480);
    const height = Math.max(16, Math.ceil(measuredHeight / 16) * 16);
    await page.send('Emulation.setDeviceMetricsOverride', {
        width: 256,
        height,
        deviceScaleFactor: 1,
        mobile: true,
    });
    const shot = await page.send('Page.captureScreenshot', { format: 'png' });
    return padToRegion(decodePng(Buffer.from(String(shot.data), 'base64')));
}

function padToRegion(image: RgbImage): RgbImage {
    const height = Math.ceil(image.height / 16) * 16;
    if (height === image.height) {
        return image;
    }

    const data = new Uint8Array(image.width * height * 3);
    data.set(image.data);
    return { width: image.width, height, data };
}

function findChrome(): string {
    const candidates = [
        process.env.CHROME_PATH,
        which('google-chrome'),
        which('google-chrome-stable'),
        which('chrome'),
        which('chromium'),
        which('chromium-browser'),
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/opt/google/chrome/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
    const found = candidates.find((candidate) => candidate !== undefined && existsSync(candidate));
    if (found === undefined) {
        throw new Error('chrome is required to score rendered pages; set CHROME_PATH');
    }
    return found;
}

/** Absolute path of a binary on PATH, when the shell can see it. */
function which(name: string): string | undefined {
    try {
        const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
        return found === '' ? undefined : found;
    } catch {
        return undefined;
    }
}

async function waitFor(url: string, server: ChildProcess): Promise<void> {
    const started = Date.now();
    let detail = '';

    while (Date.now() - started < 15_000) {
        if (server.exitCode !== null) {
            throw new Error(`vite exited ${server.exitCode}: ${detail}`);
        }
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch (error) {
            detail = error instanceof Error ? error.message : String(error);
        }
        await sleep(100);
    }

    throw new Error(`vite did not answer ${url}: ${detail}`);
}

async function connect(url: string): Promise<Cdp> {
    if (!url.endsWith('/json/version')) {
        return openSocket(url);
    }

    const started = Date.now();
    while (Date.now() - started < 10_000) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const info = (await response.json()) as { webSocketDebuggerUrl: string };
                return openSocket(info.webSocketDebuggerUrl);
            }
        } catch {
            // Chrome is still starting
        }
        await sleep(100);
    }

    throw new Error(`chrome did not open ${url}`);
}

function openSocket(url: string): Promise<Cdp> {
    const socket = new WebSocket(url);
    const pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (error: Error) => void }>();
    let next = 1;
    const ready = new Promise<void>((resolve) => socket.addEventListener('open', () => resolve()));

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data)) as { id?: number; result?: CdpResult; error?: unknown };
        if (message.id === undefined || !pending.has(message.id)) {
            return;
        }
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
            waiter?.reject(new Error(JSON.stringify(message.error)));
            return;
        }
        waiter?.resolve(message.result ?? {});
    });

    return Promise.resolve({
        async send(method: string, params: Record<string, unknown> = {}): Promise<CdpResult> {
            await ready;
            const id = next++;
            const result = new Promise<CdpResult>((resolve, reject) => pending.set(id, { resolve, reject }));
            socket.send(JSON.stringify({ id, method, params }));
            return result;
        },
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Cdp {
    send(method: string, params?: Record<string, unknown>): Promise<CdpResult>;
}

interface CdpResult {
    targetId?: string;
    data?: string;
    result?: { value?: unknown };
}
