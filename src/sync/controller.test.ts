/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';
import { db } from '../db/database.ts';
import { importDatabase, putExercise } from '../db/repository.ts';
import { pullUp } from '../domain/examples.ts';
import { createAppSync } from './controller.ts';

const stops: (() => void)[] = [];
afterEach(() => {
    for (const stop of stops.splice(0)) {
        stop();
    }
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
});

it('disables network synchronization when the build has no app key', async () => {
    vi.stubEnv('VITE_DROPBOX_APP_KEY', '');
    vi.stubEnv('VITE_SYNC_DEMO', 'false');
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    const controller = createAppSync();
    stops.push(controller.start());
    await controller.sync();
    expect(controller.configured()).toBe(false);
    expect(network).not.toHaveBeenCalled();
});

it('uses only a browser-local remote in a demo build and stops after disconnect', async () => {
    vi.stubEnv('VITE_SYNC_DEMO', 'true');
    vi.stubEnv('VITE_PREVIEW_DATA', 'false');
    vi.stubGlobal('navigator', {
        onLine: true,
        locks: {
            request: async (_name: string, options: unknown, work: (lock: object) => unknown) =>
                typeof options === 'function' ? options({}) : work({}),
        },
    });
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    await importDatabase(db, {
        schemaVersion: 4,
        exercises: [pullUp],
        templates: [],
        sessions: [],
        bodyweightMeasurements: [],
    });
    const controller = createAppSync();
    stops.push(controller.start());
    await controller.connect();
    expect(controller.state().status).toBe('synced');
    expect(network).not.toHaveBeenCalled();
    controller.disconnect();
    await putExercise(db, { ...pullUp, name: 'Offline edit' });
    await controller.sync();
    expect(controller.state().status).toBe('disconnected');
    expect((await db.exercises.get(pullUp.id))?.name).toBe('Offline edit');
    expect(network).not.toHaveBeenCalled();
});
