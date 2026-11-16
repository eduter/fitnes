/** @vitest-environment jsdom */
import { cleanup, render, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it, vi } from 'vitest';
import { createScreenWakeLock } from './createScreenWakeLock.ts';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup(request: () => Promise<unknown>) {
    vi.stubGlobal('navigator', { wakeLock: { request } });
    const [enabled, setEnabled] = createSignal(true);
    const view = render(() => {
        createScreenWakeLock(enabled);
        return <div />;
    });
    return { ...view, setEnabled };
}

it('allows manual locking and reacquires only after returning to the visible workout', async () => {
    const first = { released: false, release: vi.fn(async () => {}) };
    const next = { released: false, release: vi.fn(async () => {}) };
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValue(next);
    const view = setup(request);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    first.released = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    view.unmount();
    expect(next.release).toHaveBeenCalledTimes(1);
});

it('deduplicates pending requests and releases a late grant after completion', async () => {
    let grant!: (value: { released: boolean; release: () => Promise<void> }) => void;
    const request = vi.fn(
        () =>
            new Promise((resolve) => {
                grant = resolve;
            })
    );
    const view = setup(request);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);
    view.setEnabled(false);
    const release = vi.fn(async () => {});
    grant({ released: false, release });
    await waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);
});

it('silently tolerates denial and retries on return', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Denied'));
    setup(request);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

it('does not require browser support', () => {
    vi.stubGlobal('navigator', {});
    const view = render(() => {
        createScreenWakeLock(() => true);
        return <div />;
    });
    view.unmount();
});
