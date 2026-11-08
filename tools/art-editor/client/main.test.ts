// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { EditorConfig } from '../protocol.ts';
import html from './index.html?raw';

it('clamps captured pointer selections to native asset edges, including rows below 200', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    localStorage.clear();
    const width = 12;
    const height = 240;
    const config: EditorConfig = {
        assetId: 'test',
        assetLabel: 'Tall native asset',
        assets: [{ id: 'test', label: 'Tall native asset' }],
        width,
        height,
        token: 'test',
        baselineHash: 'test',
        emphasis: 1,
        revision: 0,
        pixels: btoa(String.fromCharCode(15).repeat(width * height)),
        lastVerified: null,
        updatedAt: 0,
        emulatorReady: false,
        recoveryMessage: '',
        saveDirectory: 'art/edited/test',
        colors: Array.from({ length: 64 }, (_, code) => ({
            code,
            name: `Color ${code}`,
            hex: '#000000',
            rgb: [0, 0, 0],
            group: 'current',
        })),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => config }));
    vi.stubGlobal('ImageData', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        putImageData: vi.fn(),
        clearRect: vi.fn(),
        strokeRect: vi.fn(),
        fillRect: vi.fn(),
        setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const art = document.querySelector<HTMLCanvasElement>('#art')!;
    art.setPointerCapture = vi.fn();
    vi.spyOn(art, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: width * 3,
        height: height * 3,
    } as DOMRect);

    await import('./main.ts');
    await vi.waitFor(() => expect(art.height).toBe(height));
    document.querySelector<HTMLButtonElement>('#select')!.click();
    art.dispatchEvent(new MouseEvent('pointerdown', { clientX: 1, clientY: 1, button: 0 }));
    art.dispatchEvent(new MouseEvent('pointermove', { clientX: width * 3 + 20, clientY: height * 3 + 20 }));
    art.dispatchEvent(new MouseEvent('pointerup'));

    expect(document.querySelector('#selection-label')!.textContent).toBe('12×240 pixels at 0, 0');
    document.querySelector<HTMLButtonElement>('#copy')!.click();
    document.querySelector<HTMLButtonElement>('#paste')!.click();
    expect(document.querySelector('#selection-label')!.textContent).toContain('Paste at 0, 0');
});

afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});
