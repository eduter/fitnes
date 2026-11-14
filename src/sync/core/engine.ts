import {
    type Checkpoint,
    type Conflict,
    type LocalSnapshot,
    type LocalStore,
    type RemoteSnapshot,
    type RemoteStore,
    type Snapshot,
    SyncFailure,
    type SyncResult,
} from './types.ts';

/** Coordinate complete snapshots using a shared baseline, never device clocks. The caller owns cross-tab serialization. */
function createSyncEngine(options: EngineOptions): SyncEngine {
    const { local, remote, decode, active, now = Date.now } = options;
    let queue: Promise<unknown> = Promise.resolve();

    function enqueue(work: () => Promise<SyncResult>): Promise<SyncResult> {
        const result = queue
            .catch(() => undefined)
            .then(async () => {
                if (!active()) {
                    return disconnected();
                }
                try {
                    return await work();
                } catch (cause) {
                    return failure(cause);
                }
            });
        queue = result;
        return result;
    }

    async function inspect(): Promise<Inspection> {
        const checkpoint = await local.checkpoint();
        const downloaded = await remote.read();
        const document = downloaded ? await decode(downloaded.content) : null;
        const current = await local.read();
        if (!active()) {
            throw new SyncFailure('permanent', 'Connection changed; sync stopped.');
        }

        // An upload may have reached Dropbox even when its response never reached this device
        if (checkpoint.journal && document?.fingerprint === checkpoint.journal.snapshot.fingerprint && downloaded) {
            checkpoint.baseline = { fingerprint: document.fingerprint, revision: downloaded.revision };
            checkpoint.journal = undefined;
            checkpoint.conflict = undefined;
            await local.saveCheckpoint(checkpoint);
        }
        return { checkpoint, downloaded, document, current };
    }

    async function rememberConflict(view: Inspection): Promise<SyncResult> {
        const { checkpoint, downloaded, current } = view;
        const previous = checkpoint.conflict;
        if (!previous || !sameCandidates(previous, current, downloaded)) {
            const conflict: Conflict = { id: crypto.randomUUID(), local: current, remote: downloaded };
            await local.preserveConflict(conflict);
            checkpoint.conflict = conflict;
            await local.saveCheckpoint(checkpoint);
        }
        return {
            status: 'conflict',
            message: downloaded
                ? 'Both copies changed. Choose which complete dataset to use.'
                : 'The Dropbox file was removed. Review before recreating it.',
            conflict: checkpoint.conflict,
        };
    }

    function acknowledged(checkpoint: Checkpoint, snapshot: Snapshot, revision: string): Checkpoint {
        return { key: checkpoint.key, baseline: { fingerprint: snapshot.fingerprint, revision }, lastSyncedAt: now() };
    }

    async function acknowledge(view: Inspection): Promise<SyncResult> {
        const { checkpoint, current, downloaded } = view;
        if (!downloaded) {
            return rememberConflict(view);
        }
        const next = acknowledged(checkpoint, current, downloaded.revision);
        if (!active()) {
            return disconnected();
        }
        await local.saveCheckpoint(next);
        return settled(next, current.fingerprint);
    }

    async function settled(checkpoint: Checkpoint, sentFingerprint: string): Promise<SyncResult> {
        const latest = await local.read();
        if (!active()) {
            return disconnected();
        }
        if (latest.fingerprint !== sentFingerprint) {
            return {
                status: 'pending',
                message: 'New local changes are waiting to upload.',
                lastSyncedAt: checkpoint.lastSyncedAt,
            };
        }
        return { status: 'synced', message: 'Up to date with Dropbox.', lastSyncedAt: checkpoint.lastSyncedAt };
    }

    async function push(view: Inspection, exact = false): Promise<SyncResult> {
        const { checkpoint, current, downloaded } = view;
        if (downloaded) {
            await remote.backup(downloaded, exact);
        }
        if (!active()) {
            return disconnected();
        }
        const journal = { snapshot: current, expectedRevision: downloaded?.revision ?? null };
        await local.saveCheckpoint({ ...checkpoint, journal });
        if (!active()) {
            return disconnected();
        }
        const uploaded = await remote.write(current.content, journal.expectedRevision);
        if (!active()) {
            return disconnected();
        }
        const next = acknowledged(checkpoint, current, uploaded.revision);
        await local.saveCheckpoint(next);
        return settled(next, current.fingerprint);
    }

    async function pull(view: Inspection): Promise<SyncResult> {
        const { checkpoint, current, downloaded, document } = view;
        if (!downloaded || !document) {
            return rememberConflict(view);
        }
        if (!active()) {
            return disconnected();
        }
        const next = acknowledged(checkpoint, document, downloaded.revision);
        const replaced = await local.replace(current.generation, document, next);
        if (!replaced) {
            return {
                status: 'waiting',
                message: 'Dropbox changes are waiting. Close editors and workout tracking to apply them.',
            };
        }
        return settled(next, document.fingerprint);
    }

    async function syncNow(): Promise<SyncResult> {
        const view = await inspect();
        const { checkpoint, current, downloaded, document } = view;
        if (document?.fingerprint === current.fingerprint) {
            return acknowledge(view);
        }
        if (checkpoint.conflict) {
            return rememberConflict(view);
        }
        if (!checkpoint.baseline) {
            if (!downloaded) {
                return push(view);
            }
            if (current.empty) {
                return pull(view);
            }
            return rememberConflict(view);
        }
        if (!downloaded) {
            return rememberConflict(view);
        }
        const localChanged = current.fingerprint !== checkpoint.baseline.fingerprint;
        const remoteChanged = document?.fingerprint !== checkpoint.baseline.fingerprint;
        if (localChanged && remoteChanged) {
            return rememberConflict(view);
        }
        if (remoteChanged) {
            return pull(view);
        }
        if (localChanged) {
            return push(view);
        }
        return acknowledge(view);
    }

    async function resolveNow(id: string, choice: 'local' | 'remote'): Promise<SyncResult> {
        const reviewed = (await local.checkpoint()).conflict;
        const view = await inspect();
        if (!reviewed || reviewed.id !== id || !sameCandidates(reviewed, view.current, view.downloaded)) {
            return rememberConflict(view);
        }
        if (choice === 'remote') {
            return pull(view);
        }
        return push(view, true);
    }

    return { sync: () => enqueue(syncNow), resolve: (id, choice) => enqueue(() => resolveNow(id, choice)) };
}

/** Dependencies needed to synchronize one application document. */
interface EngineOptions {
    local: LocalStore;
    remote: RemoteStore;
    decode: (content: string) => Promise<Snapshot>;
    active: () => boolean;
    now?: () => number;
}

/** Serialized engine actions; conflict choices require the exact reviewed identifier. */
interface SyncEngine {
    sync(): Promise<SyncResult>;
    resolve(id: string, choice: 'local' | 'remote'): Promise<SyncResult>;
}

interface Inspection {
    checkpoint: Checkpoint;
    current: LocalSnapshot;
    downloaded: RemoteSnapshot | null;
    document: Snapshot | null;
}

function sameCandidates(conflict: Conflict, local: LocalSnapshot, remote: RemoteSnapshot | null): boolean {
    return (
        conflict.local.generation === local.generation &&
        conflict.local.fingerprint === local.fingerprint &&
        conflict.remote?.revision === remote?.revision &&
        conflict.remote?.content === remote?.content
    );
}

function disconnected(): SyncResult {
    return { status: 'disconnected', message: 'Dropbox is disconnected. Local data is available.' };
}

function failure(cause: unknown): SyncResult {
    const message = cause instanceof Error ? cause.message : 'Synchronization failed.';
    if (!(cause instanceof SyncFailure)) {
        return { status: 'error', message };
    }
    if (cause.kind === 'auth') {
        return { status: 'reauth', message };
    }
    if (cause.kind === 'transient') {
        return { status: 'offline', message, retryAfterMs: cause.retryAfterMs };
    }
    if (cause.kind === 'changed') {
        return { status: 'pending', message: 'Dropbox changed during sync. Checking again.' };
    }
    return { status: 'error', message };
}

export type { EngineOptions, SyncEngine };
export { createSyncEngine };
