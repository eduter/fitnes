/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it, vi } from 'vitest';
import type { SyncController, SyncUiState } from '../sync/controller.ts';
import { SyncSettings } from './SyncSettings.tsx';

afterEach(cleanup);

function controller(initial: SyncUiState = { status: 'disconnected', message: 'Local data is available.' }) {
    const [state, setState] = createSignal(initial);
    const result: SyncController = {
        state,
        connected: () => state().status !== 'disconnected',
        configured: () => true,
        demo: () => false,
        start: () => () => {},
        connect: vi.fn(async () => {}),
        disconnect: vi.fn(),
        sync: vi.fn(async () => {}),
        resolve: vi.fn(async () => {}),
    };
    return { result, setState };
}

it('keeps connection optional and explains that local data stays available', () => {
    const f = controller();
    render(() => <SyncSettings controller={f.result} />);
    expect(screen.getByRole('button', { name: 'Connect Dropbox' })).toBeTruthy();
    expect(screen.getByText(/Local data is available/)).toBeTruthy();
});

it('requires confirmation before replacing either conflict candidate', async () => {
    const f = controller({
        status: 'conflict',
        message: 'Both copies changed.',
        conflict: {
            id: 'reviewed',
            local: {
                content:
                    '{"version":1,"data":{"exercises":[],"templates":[],"sessions":[],"bodyweightMeasurements":[]}}',
                fingerprint: 'local',
                generation: 1,
                empty: true,
            },
            remote: {
                content:
                    '{"version":1,"data":{"exercises":[],"templates":[],"sessions":[],"bodyweightMeasurements":[]}}',
                revision: 'r1',
            },
        },
    });
    render(() => <SyncSettings controller={f.result} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use Dropbox' }));
    expect(f.result.resolve).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    fireEvent.animationEnd(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes', exact: true }));
    await waitFor(() => expect(f.result.resolve).toHaveBeenCalledWith('reviewed', 'remote'));
});

it('offers reconnect after authentication expiration', () => {
    const f = controller({ status: 'reauth', message: 'Dropbox access expired. Reconnect to sync.' });
    render(() => <SyncSettings controller={f.result} />);
    expect(screen.getByRole('button', { name: 'Reconnect Dropbox' })).toBeTruthy();
});
