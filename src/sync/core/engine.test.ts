import { describe, expect, it } from 'vitest';
import { createSyncEngine } from './engine.ts';
import { type Checkpoint, type LocalSnapshot, type RemoteSnapshot, type Snapshot, SyncFailure } from './types.ts';

function snapshot(content: string): Snapshot {
    return { content, fingerprint: content, empty: content === '' };
}

function fixture(localContent = 'base', remoteContent: string | null = 'base', baseline: string | null = 'base') {
    let local: LocalSnapshot = { ...snapshot(localContent), generation: 1 };
    let remote: RemoteSnapshot | null = remoteContent === null ? null : { content: remoteContent, revision: 'r1' };
    let checkpoint: Checkpoint = {
        key: 'test',
        baseline: baseline === null ? undefined : { fingerprint: baseline, revision: 'r1' },
    };
    const backups: string[] = [];
    let failUpload = false;
    let failBackup = false;
    let canApply = true;
    let uploadHook = () => {};
    let uploads = 0;
    const engine = createSyncEngine({
        local: {
            read: async () => structuredClone(local),
            checkpoint: async () => structuredClone(checkpoint),
            saveCheckpoint: async (next) => {
                checkpoint = structuredClone(next);
            },
            preserveConflict: async (conflict) => {
                if (failBackup) {
                    throw new Error('backup failed');
                }
                backups.push(conflict.local.content, conflict.remote?.content ?? 'missing');
            },
            replace: async (expected, next, state) => {
                if (!canApply || local.generation !== expected) {
                    return false;
                }
                backups.push(local.content);
                local = { ...next, generation: local.generation + 1 };
                checkpoint = structuredClone(state);
                return true;
            },
        },
        remote: {
            read: async () => structuredClone(remote),
            backup: async (previous) => {
                if (failBackup) {
                    throw new Error('backup failed');
                }
                backups.push(previous.content);
            },
            write: async (content, revision) => {
                uploads++;
                uploadHook();
                if ((remote?.revision ?? null) !== revision) {
                    throw new SyncFailure('changed', 'revision changed');
                }
                if (failUpload) {
                    throw new SyncFailure('transient', 'offline');
                }
                remote = { content, revision: `r${uploads + 1}` };
                return structuredClone(remote);
            },
        },
        decode: async (content) => snapshot(content),
        active: () => true,
        now: () => 123,
    });
    return {
        engine,
        backups,
        get local() {
            return local;
        },
        get remote() {
            return remote;
        },
        get checkpoint() {
            return checkpoint;
        },
        get uploads() {
            return uploads;
        },
        edit: (content: string) => {
            local = { ...snapshot(content), generation: local.generation + 1 };
        },
        remoteEdit: (content: string) => {
            remote = { content, revision: 'other-device' };
        },
        setFailUpload: () => {
            failUpload = true;
        },
        setFailBackup: () => {
            failBackup = true;
        },
        setCanApply: (value: boolean) => {
            canApply = value;
        },
        onUpload: (fn: () => void) => {
            uploadHook = fn;
        },
    };
}

describe('snapshot synchronization', () => {
    it.each([
        ['base', 'base', 'synced'],
        ['local', 'base', 'synced'],
        ['base', 'remote', 'synced'],
        ['same', 'same', 'synced'],
        ['local', 'remote', 'conflict'],
    ])('compares local %s and remote %s with their baseline', async (local, remote, status) => {
        const f = fixture(local, remote);
        expect((await f.engine.sync()).status).toBe(status);
        if (status === 'synced') {
            expect(f.local.content).toBe(f.remote?.content);
        } else {
            expect(f.local.content).toBe(local);
            expect(f.remote?.content).toBe(remote);
            expect(f.backups).toEqual([local, remote]);
        }
    });

    it('creates a missing remote on first synchronization', async () => {
        const f = fixture('local', null, null);
        expect((await f.engine.sync()).status).toBe('synced');
        expect(f.remote?.content).toBe('local');
    });

    it('pulls initial remote data into an empty local dataset', async () => {
        const f = fixture('', 'remote', null);
        expect((await f.engine.sync()).status).toBe('synced');
        expect(f.local.content).toBe('remote');
    });

    it('asks when different data exists on both sides without a baseline', async () => {
        const f = fixture('local', 'remote', null);
        expect((await f.engine.sync()).status).toBe('conflict');
    });

    it('requires a choice when a previously synchronized remote disappears', async () => {
        const f = fixture('base', null);
        expect((await f.engine.sync()).status).toBe('conflict');
        expect(f.uploads).toBe(0);
    });

    it('keeps a durable journal and baseline after a failed upload', async () => {
        const f = fixture('local');
        f.setFailUpload();
        expect((await f.engine.sync()).status).toBe('offline');
        expect(f.checkpoint.baseline?.fingerprint).toBe('base');
        expect(f.checkpoint.journal?.snapshot.content).toBe('local');
    });

    it('does not acknowledge edits made while an upload is in flight', async () => {
        const f = fixture('local');
        f.onUpload(() => f.edit('later'));
        expect((await f.engine.sync()).status).toBe('pending');
        expect(f.checkpoint.baseline?.fingerprint).toBe('local');
        expect(f.local.content).toBe('later');
    });

    it('reconciles a successful upload whose acknowledgement was interrupted', async () => {
        const f = fixture('sent');
        f.setFailUpload();
        await f.engine.sync();
        f.remoteEdit('sent');
        f.edit('later');
        expect((await f.engine.sync()).status).toBe('offline');
        expect(f.checkpoint.baseline?.fingerprint).toBe('sent');
        expect(f.local.content).toBe('later');
    });

    it('refuses to overwrite a competing remote upload', async () => {
        const f = fixture('local');
        f.onUpload(() => f.remoteEdit('competitor'));
        expect((await f.engine.sync()).status).toBe('pending');
        expect(f.remote?.content).toBe('competitor');
        expect((await f.engine.sync()).status).toBe('conflict');
    });

    it('blocks replacement and uploads when recovery storage fails', async () => {
        const f = fixture('local');
        f.setFailBackup();
        expect((await f.engine.sync()).status).toBe('error');
        expect(f.remote?.content).toBe('base');
        expect(f.uploads).toBe(0);
    });

    it('defers a pull while an editor holds the data', async () => {
        const f = fixture('base', 'remote');
        f.setCanApply(false);
        expect((await f.engine.sync()).status).toBe('waiting');
        expect(f.local.content).toBe('base');
        f.setCanApply(true);
        expect((await f.engine.sync()).status).toBe('synced');
    });

    it.each(['local', 'remote'] as const)('resolves using the reviewed %s snapshot', async (choice) => {
        const f = fixture('local', 'remote');
        const conflict = (await f.engine.sync()).conflict!;
        expect((await f.engine.resolve(conflict.id, choice)).status).toBe('synced');
        expect(f.local.content).toBe(choice);
        expect(f.remote?.content).toBe(choice);
    });

    it('reopens review if either conflict candidate changed', async () => {
        const f = fixture('local', 'remote');
        const conflict = (await f.engine.sync()).conflict!;
        f.edit('later');
        const result = await f.engine.resolve(conflict.id, 'remote');
        expect(result.status).toBe('conflict');
        expect(result.conflict?.local.content).toBe('later');
        expect(f.local.content).toBe('later');
    });
});
