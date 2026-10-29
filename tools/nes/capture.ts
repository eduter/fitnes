import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Capture the real page at 256 CSS pixels, DPR 1, without changing its viewport height. */
async function capturePage(url: string, readySelector = 'body'): Promise<Uint8Array> {
    const address = new URL(url);
    if (!['http:', 'https:'].includes(address.protocol)) {
        throw new Error('Capture URL must use http or https');
    }
    const profile = mkdtempSync(join(tmpdir(), 'fitnes-nes-'));
    const chrome = spawn(
        process.env.CHROME_PATH ?? 'chromium',
        [
            '--headless=new',
            '--no-sandbox',
            '--hide-scrollbars',
            '--force-device-scale-factor=1',
            '--remote-debugging-port=0',
            `--user-data-dir=${profile}`,
            'about:blank',
        ],
        { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let launchError = '';
    chrome.on('error', (error) => {
        launchError = error.message;
    });
    chrome.stderr.on('data', (chunk) => {
        launchError = (launchError + String(chunk)).slice(-2000);
    });
    let cdp: Cdp | undefined;
    try {
        let port = '';
        await until(async () => {
            if (chrome.exitCode !== null || chrome.pid === undefined) {
                throw new Error(`Chrome failed to start (set CHROME_PATH): ${launchError}`);
            }
            try {
                port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
            } catch {
                return false;
            }
            return port.length > 0;
        });
        const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
            type: string;
            webSocketDebuggerUrl: string;
        }[];
        const target = targets.find((entry) => entry.type === 'page');
        if (!target) {
            throw new Error('Chrome did not open a page');
        }
        cdp = await connect(target.webSocketDebuggerUrl);
        await cdp.send('Page.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 256,
            height: 240,
            deviceScaleFactor: 1,
            mobile: false,
        });
        const navigation = await cdp.send('Page.navigate', { url });
        if (navigation.errorText) {
            throw new Error(`Navigation failed for ${url}: ${navigation.errorText}`);
        }
        const page = cdp;
        let lastError = '';
        await until(
            async () => {
                try {
                    const result = await page.send('Runtime.evaluate', {
                        expression: `(async () => { if (location.href === 'about:blank' || document.readyState !== 'complete') return false; await document.fonts.ready; return !!document.querySelector(${JSON.stringify(readySelector)}); })()`,
                        awaitPromise: true,
                        returnByValue: true,
                    });
                    if (result.exceptionDetails) {
                        throw new Error(JSON.stringify(result.exceptionDetails));
                    }
                    return result.result?.value === true;
                } catch (error) {
                    // Navigation can destroy the old execution context before the new one exists
                    lastError = String(error);
                    return false;
                }
            },
            () => `Page never became ready for ${JSON.stringify(readySelector)} at ${url}: ${lastError}`
        );
        const metrics = await cdp.send('Page.getLayoutMetrics');
        const size = metrics.cssContentSize;
        if (size?.width !== 256) {
            throw new Error(`Page overflows the 256-pixel column (content width ${size?.width})`);
        }
        if (size.height > 65_536) {
            throw new Error('Page exceeds capture limit of 65536 logical pixels');
        }
        const shot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true,
            clip: { x: 0, y: 0, width: 256, height: Math.ceil(size.height), scale: 1 },
        });
        if (!shot.data) {
            throw new Error('Chrome returned no screenshot');
        }
        return Buffer.from(shot.data, 'base64');
    } finally {
        cdp?.close();
        if (chrome.exitCode === null && chrome.pid !== undefined) {
            await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    chrome.kill('SIGKILL');
                }, 2000);
                chrome.once('exit', () => {
                    clearTimeout(timer);
                    resolve();
                });
                chrome.kill();
            });
        }
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

interface Cdp {
    send(method: string, params?: Record<string, unknown>): Promise<CdpResult>;
    close(): void;
}

interface CdpResult {
    errorText?: string;
    data?: string;
    result?: { value?: unknown };
    cssContentSize?: { width: number; height: number };
    exceptionDetails?: unknown;
}

async function connect(url: string): Promise<Cdp> {
    const socket = new WebSocket(url);
    const pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (error: Error) => void }>();
    let nextId = 0;
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data)) as { id?: number; result?: CdpResult; error?: unknown };
        if (message.id === undefined) {
            return;
        }
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
            request?.reject(new Error(JSON.stringify(message.error)));
        } else {
            request?.resolve(message.result ?? {});
        }
    });
    socket.addEventListener('close', () => {
        for (const request of pending.values()) {
            request.reject(new Error('Chrome disconnected'));
        }
        pending.clear();
    });
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error('Chrome connection timed out'));
        }, 10_000);
        socket.addEventListener(
            'open',
            () => {
                clearTimeout(timer);
                resolve();
            },
            { once: true }
        );
        socket.addEventListener(
            'error',
            () => {
                clearTimeout(timer);
                reject(new Error('Chrome connection failed'));
            },
            { once: true }
        );
    });
    return {
        async send(method, params = {}) {
            const id = ++nextId;
            return new Promise<CdpResult>((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error(`Chrome timed out: ${method}`));
                }, 15_000);
                pending.set(id, {
                    resolve: (value) => {
                        clearTimeout(timer);
                        resolve(value);
                    },
                    reject: (error) => {
                        clearTimeout(timer);
                        reject(error);
                    },
                });
                socket.send(JSON.stringify({ id, method, params }));
            });
        },
        close() {
            socket.close();
        },
    };
}

async function until(ready: () => Promise<boolean>, message = () => 'Chrome did not start'): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 15_000) {
        if (await ready()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(message());
}

export { capturePage };
