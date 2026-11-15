import type { RemoteSnapshot, RemoteStore } from './core/types.ts';
import { SyncFailure } from './core/types.ts';

/** Browser-local remote simulation for isolated review builds; this module never contacts Dropbox. */
function createDemoStore(storage: Storage): RemoteStore {
    const key = 'fitnes-sync-demo-remote';
    async function read(): Promise<RemoteSnapshot | null> {
        return JSON.parse(storage.getItem(key) ?? 'null') as RemoteSnapshot | null;
    }
    return {
        read,
        write: async (content, revision) => {
            if ((await read())?.revision !== (revision ?? undefined)) {
                throw new SyncFailure('changed', 'Simulated remote revision changed.');
            }
            const next = { content, revision: crypto.randomUUID() };
            storage.setItem(key, JSON.stringify(next));
            return next;
        },
        backup: async (previous, exact) => {
            const daily = `fitnes-sync-demo-backup:${new Date().toISOString().slice(0, 10)}`;
            if (!storage.getItem(daily)) {
                storage.setItem(daily, previous.content);
            }
            if (exact) {
                storage.setItem(`fitnes-sync-demo-conflict:${previous.revision}`, previous.content);
            }
        },
    };
}

export { createDemoStore };
