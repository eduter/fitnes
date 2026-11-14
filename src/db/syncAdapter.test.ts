import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPORT_SCHEMA_VERSION } from '../domain/dataExport.ts';
import { pullUp } from '../domain/examples.ts';
import { stableJson } from '../sync/core/content.ts';
import { FitnesDB } from './database.ts';
import { deleteExercise, exportDatabase, importDatabase, putExercise, seedExampleExercises } from './repository.ts';
import { createLocalStore, decodeSnapshot, readLocalMetadata, restoreBackup } from './syncAdapter.ts';

const empty = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exercises: [],
    templates: [],
    sessions: [],
    bodyweightMeasurements: [],
};
let db: FitnesDB;
beforeEach(async () => {
    await Dexie.delete('fitnes');
    db = new FitnesDB();
    await db.open();
});
afterEach(async () => {
    db.close();
    await Dexie.delete('fitnes');
});

describe('FitNES sync persistence', () => {
    it('tracks saves and deletions in durable transactions while disconnected', async () => {
        await putExercise(db, pullUp);
        const afterSave = await readLocalMetadata(db);
        await deleteExercise(db, pullUp.id);
        const afterDelete = await readLocalMetadata(db);
        expect(afterSave.generation).toBe(1);
        expect(afterDelete.generation).toBe(2);
        expect((await createLocalStore(db, 'scope').read()).empty).toBe(true);
    });
    it('backs up raw rows before import, including rows validation cannot read', async () => {
        await db.exercises.put({ ...pullUp, name: '' });
        await importDatabase(db, empty);
        expect(JSON.parse((await db.syncBackups.toArray())[0].content).exercises[0].name).toBe('');
        expect((await readLocalMetadata(db)).epoch).toBe(1);
    });
    it('does not reseed an intentionally emptied dataset', async () => {
        await seedExampleExercises(db);
        await importDatabase(db, empty);
        await seedExampleExercises(db);
        expect(await db.exercises.count()).toBe(0);
    });
    it('rolls back replacement if its backup cannot be saved', async () => {
        await putExercise(db, pullUp);
        const spy = vi.spyOn(db.syncBackups, 'put').mockRejectedValueOnce(new Error('quota'));
        await expect(importDatabase(db, empty)).rejects.toThrow('quota');
        spy.mockRestore();
        expect(await db.exercises.get(pullUp.id)).toEqual(pullUp);
    });
    it('rejects stale record saves instead of replacing a newer row', async () => {
        await putExercise(db, pullUp);
        const guard = { epoch: 0, previous: stableJson(pullUp) };
        await putExercise(db, { ...pullUp, name: 'Other tab' });
        await expect(putExercise(db, { ...pullUp, name: 'Old editor' }, guard)).rejects.toThrow('changed');
        expect((await db.exercises.get(pullUp.id))?.name).toBe('Other tab');
    });
    it('checks the local generation atomically before pull and commits its baseline with replacement', async () => {
        const local = createLocalStore(db, 'scope');
        const before = await local.read();
        await putExercise(db, pullUp);
        const incoming = await decodeSnapshot(JSON.stringify({ version: 1, data: empty }));
        expect(await local.replace(before.generation, incoming, { key: 'scope' })).toBe(false);
        const current = await local.read();
        expect(
            await local.replace(current.generation, incoming, {
                key: 'scope',
                baseline: { fingerprint: incoming.fingerprint, revision: 'r2' },
            })
        ).toBe(true);
        expect((await local.checkpoint()).baseline?.revision).toBe('r2');
        expect(await db.exercises.count()).toBe(0);
    });
    it('keeps only 20 routine backups and retains pinned conflicts', async () => {
        const local = createLocalStore(db, 'scope');
        const current = await local.read();
        await local.preserveConflict({
            id: 'conflict',
            local: current,
            remote: { content: 'original bytes', revision: 'r1' },
        });
        for (let index = 0; index < 24; index++) {
            await importDatabase(db, empty);
        }
        const copies = await db.syncBackups.toArray();
        expect(copies.filter((copy) => !copy.pinned)).toHaveLength(20);
        expect(copies.filter((copy) => copy.pinned)).toHaveLength(2);
    });
    it('restores a recovery copy as a new pending local mutation', async () => {
        await putExercise(db, pullUp);
        await importDatabase(db, empty);
        const copy = (await db.syncBackups.toArray())[0];
        const generation = (await readLocalMetadata(db)).generation;
        await restoreBackup(db, copy.id);
        expect((await exportDatabase(db)).exercises).toEqual([pullUp]);
        expect((await readLocalMetadata(db)).generation).toBe(generation + 1);
    });
    it('keeps account checkpoints independent without changing local domain data', async () => {
        await putExercise(db, pullUp);
        const first = createLocalStore(db, 'account-one');
        await first.saveCheckpoint({ key: 'account-one', baseline: { fingerprint: 'known', revision: 'r1' } });
        const second = createLocalStore(db, 'account-two');
        expect((await second.checkpoint()).baseline).toBeUndefined();
        expect((await second.read()).empty).toBe(false);
        expect((await first.checkpoint()).baseline?.revision).toBe('r1');
    });

    it('unpins superseded conflict candidates while protecting the current review', async () => {
        const local = createLocalStore(db, 'scope');
        const first = { id: 'first', local: await local.read(), remote: { content: 'first', revision: 'r1' } };
        await local.preserveConflict(first);
        await local.saveCheckpoint({ key: 'scope', conflict: first });
        const second = { ...first, id: 'second', remote: { content: 'second', revision: 'r2' } };
        await local.preserveConflict(second);
        expect((await db.syncBackups.get('first-local'))?.pinned).toBe(0);
        expect((await db.syncBackups.get('second-remote'))?.pinned).toBe(1);
    });

    it('fingerprints record ordering and export times consistently', async () => {
        const data = { ...empty, exercises: [pullUp, { ...pullUp, id: 'another', name: 'Another' }] };
        const first = await decodeSnapshot(JSON.stringify({ version: 1, data: { ...data, exportedAt: 1 } }));
        const second = await decodeSnapshot(
            JSON.stringify({ version: 1, data: { ...data, exportedAt: 999, exercises: [...data.exercises].reverse() } })
        );
        expect(first.fingerprint).toBe(second.fingerprint);
    });
    it.each([
        { version: 2, data: empty },
        { version: 1, data: { ...empty, unknownCollection: [] } },
        { version: 1, data: { schemaVersion: 4 } },
        { version: 1, data: { ...empty, schemaVersion: 5 } },
        { version: 1, data: { ...empty, exercises: [pullUp, pullUp] } },
    ])('blocks unsupported, incomplete, and duplicate documents', async (document) => {
        await expect(decodeSnapshot(JSON.stringify(document))).rejects.toThrow();
    });
});
