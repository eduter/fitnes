import {
    type CollectionName,
    collectionNames,
    type DataExport,
    EXPORT_SCHEMA_VERSION,
    parseDataExport,
} from '../domain/dataExport.ts';
import { fingerprint, stableJson } from '../sync/core/content.ts';
import type { Checkpoint, Conflict, LocalStore, Snapshot } from '../sync/core/types.ts';
import { withIdleData } from '../sync/locks.ts';
import { notifyDataChange } from './changes.ts';
import type { FitnesDB } from './database.ts';

/** Adapt current FitNES collections to the framework-independent synchronization engine. */
function createLocalStore(db: FitnesDB, scope: string, active: () => boolean = () => true): LocalStore {
    const read = async () => {
        const captured = await db.transaction('r', [...domainTables(db), db.syncLocal], async () => ({
            data: await rawData(db),
            meta: await readLocalMetadata(db),
        }));
        const snapshot = await encodeSnapshot(captured.data);
        return { ...snapshot, generation: captured.meta.generation };
    };
    const checkpoint = async (): Promise<Checkpoint> => (await db.syncState.get(scope)) ?? { key: scope };
    return {
        read,
        checkpoint,
        saveCheckpoint: async (next) => {
            if (!active()) {
                return;
            }
            await db.transaction('rw', db.syncState, db.syncBackups, async () => {
                if (!active()) {
                    return;
                }
                const previous = await checkpoint();
                await db.syncState.put(next);
                if (previous.conflict && !next.conflict) {
                    await db.syncBackups.where('conflictId').equals(previous.conflict.id).modify({ pinned: 0 });
                    await pruneBackups(db);
                }
            });
        },
        preserveConflict: (conflict) => preserveConflict(db, conflict),
        replace: (generation, snapshot, next) =>
            withIdleData(async () => {
                if (!active()) {
                    return false;
                }
                const data = parseSyncDocument(snapshot.content);
                return replaceLocalData(db, data, 'Before Dropbox download', generation, next, active);
            }),
    };
}

/** Reject partial sync documents while preserving the more permissive manual import format. */
async function decodeSnapshot(content: string): Promise<Snapshot> {
    return encodeSnapshot(parseSyncDocument(content));
}

/** Encode canonical records; collection order and export times cannot create false conflicts. */
async function encodeSnapshot(data: DataExport): Promise<Snapshot> {
    const source = { ...data };
    if (source.exportedAt === undefined) {
        delete source.exportedAt;
    }
    const parsed = parseDataExport(source);
    if (!parsed.ok) {
        throw new Error(
            `Invalid sync data: ${parsed.errors.map((error) => `${error.path}: ${error.message}`).join('; ')}`
        );
    }
    assertUniqueIds(parsed.value);
    const normalized: DataExport = { ...parsed.value, schemaVersion: EXPORT_SCHEMA_VERSION, exportedAt: undefined };
    for (const name of collectionNames) {
        normalized[name] = [...normalized[name]].sort((left, right) =>
            left.id < right.id ? -1 : left.id > right.id ? 1 : 0
        ) as never;
    }
    const content = stableJson({ version: 1, data: normalized });
    return {
        content,
        fingerprint: await fingerprint(content),
        empty: collectionNames.every((name) => !normalized[name].length),
    };
}

/** Persistence metadata exists independently of any Dropbox connection. */
interface LocalMetadata {
    key: string;
    generation: number;
    epoch: number;
    initialized: boolean;
}

/** A prior local dataset or exact conflict candidate, including device-local timer recovery. */
interface RecoveryCopy {
    id: string;
    content: string;
    createdAt: number;
    label: string;
    pinned: number;
    conflictId?: string;
    guidedCaches?: Record<string, string>;
}

/** The row and dataset version an editor originally observed. */
interface WriteGuard {
    epoch: number;
    previous: string | undefined;
}

/** Read missing metadata as a pristine local database. */
async function readLocalMetadata(db: FitnesDB): Promise<LocalMetadata> {
    return (await db.syncLocal.get('local')) ?? { key: 'local', generation: 0, epoch: 0, initialized: false };
}

/** Persist a domain mutation and its generation together, checking an optional editor precondition. */
async function mutateRecord(
    db: FitnesDB,
    collection: CollectionName,
    id: string,
    write: () => Promise<unknown>,
    guard?: WriteGuard
): Promise<void> {
    await db.transaction('rw', [...domainTables(db), db.syncLocal], async (transaction) => {
        const meta = await readLocalMetadata(db);
        if (guard) {
            const previous = await db.table(collection).get(id);
            if (
                meta.epoch !== guard.epoch ||
                (previous === undefined ? undefined : stableJson(previous)) !== guard.previous
            ) {
                throw new Error(
                    'This record changed in another tab or dataset. Your draft is retained; reopen the editor to review the current copy.'
                );
            }
        }
        await write();
        await db.syncLocal.put({ ...meta, generation: meta.generation + 1 });
        transaction.on('complete', notifyDataChange);
    });
}

/** Preserve the raw current database before replacing all current domain collections. */
async function replaceLocalData(
    db: FitnesDB,
    data: DataExport,
    label = 'Before import',
    expectedGeneration?: number,
    checkpoint?: Checkpoint,
    active: () => boolean = () => true
): Promise<boolean> {
    const caches = guidedCaches();
    const replaced = await db.transaction(
        'rw',
        [...domainTables(db), db.syncLocal, db.syncState, db.syncBackups],
        async (transaction) => {
            const meta = await readLocalMetadata(db);
            if (!active()) {
                return false;
            }
            if (expectedGeneration !== undefined && meta.generation !== expectedGeneration) {
                return false;
            }
            await db.syncBackups.put({
                id: crypto.randomUUID(),
                content: JSON.stringify(await rawData(db)),
                createdAt: Date.now(),
                label,
                pinned: 0,
                guidedCaches: caches,
            });
            await pruneBackups(db);
            for (const name of collectionNames) {
                await db.table(name).clear();
                await db.table(name).bulkPut(data[name]);
            }
            await db.syncLocal.put({
                ...meta,
                initialized: true,
                generation: meta.generation + 1,
                epoch: meta.epoch + 1,
            });
            if (checkpoint) {
                const previous = await db.syncState.get(checkpoint.key);
                await db.syncState.put(checkpoint);
                if (previous?.conflict) {
                    await db.syncBackups.where('conflictId').equals(previous.conflict.id).modify({ pinned: 0 });
                    await pruneBackups(db);
                }
            }
            transaction.on('complete', notifyDataChange);
            return true;
        }
    );
    if (replaced) {
        synchronizeGuidedEpoch((await readLocalMetadata(db)).epoch);
    }
    return replaced;
}

/** Restore a validated backup as a local edit, retaining a backup of the displaced current data. */
async function restoreBackup(db: FitnesDB, id: string): Promise<boolean> {
    const copy = await db.syncBackups.get(id);
    if (!copy) {
        throw new Error('Recovery copy no longer exists.');
    }
    const parsed = parseDataExport(unwrapBackup(copy.content));
    if (!parsed.ok) {
        throw new Error(
            'This raw backup cannot be restored by this build. Download it to recover or repair its records.'
        );
    }
    const restored = await withIdleData(() => replaceLocalData(db, parsed.value, 'Before recovery restore'));
    if (restored) {
        synchronizeGuidedEpoch((await readLocalMetadata(db)).epoch);
        for (const [key, value] of Object.entries(copy.guidedCaches ?? {})) {
            try {
                localStorage.setItem(key, value);
            } catch {
                /* Domain restore remains valid without transient storage */
            }
        }
    }
    return restored;
}

/** Clear stale timers after a committed dataset replacement, including recovery after a crash. */
function synchronizeGuidedEpoch(epoch: number): void {
    try {
        if (localStorage.getItem('fitnes-guided-epoch') === String(epoch)) {
            return;
        }
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('fitnes-guided:')) {
                localStorage.removeItem(key);
            }
        }
        localStorage.setItem('fitnes-guided-epoch', String(epoch));
    } catch {
        /* Transient storage does not gate local IndexedDB data */
    }
}

/** Read unvalidated domain rows for recoverable exports, never interpreting legacy scaffold records. */
async function rawData(db: FitnesDB): Promise<DataExport> {
    const [exercises, templates, sessions, bodyweightMeasurements] = await Promise.all(
        collectionNames.map((name) => db.table(name).toArray())
    );
    return { schemaVersion: EXPORT_SCHEMA_VERSION, exercises, templates, sessions, bodyweightMeasurements };
}

/** Tables participating in every consistent domain snapshot or mutation. */
function domainTables(db: FitnesDB): ReturnType<FitnesDB['table']>[] {
    return collectionNames.map((name) => db.table(name));
}

function parseSyncDocument(content: string): DataExport {
    const source = JSON.parse(content);
    if (source?.version !== 1 || !source.data) {
        throw new Error('Unsupported sync document version.');
    }
    const { data } = source;
    if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1 || data.schemaVersion > EXPORT_SCHEMA_VERSION) {
        throw new Error('Unsupported FitNES data version. Update the app before syncing.');
    }
    for (const name of collectionNames) {
        if (!Array.isArray(data[name])) {
            throw new Error(`Incomplete sync document: ${name} is missing.`);
        }
    }
    const parsed = parseDataExport(data);
    if (!parsed.ok) {
        throw new Error(
            `Invalid Dropbox data: ${parsed.errors.map((error) => `${error.path}: ${error.message}`).join('; ')}`
        );
    }
    assertUniqueIds(parsed.value);
    return parsed.value;
}

function assertUniqueIds(data: DataExport): void {
    for (const name of collectionNames) {
        if (new Set(data[name].map((row) => row.id)).size !== data[name].length) {
            throw new Error(`Duplicate record IDs in ${name}. Sync blocked.`);
        }
    }
}

function guidedCaches(): Record<string, string> {
    try {
        return Object.fromEntries(
            Object.keys(localStorage)
                .filter((key) => key.startsWith('fitnes-guided:'))
                .map((key) => [key, localStorage.getItem(key) ?? ''])
        );
    } catch {
        return {};
    }
}

async function pruneBackups(db: FitnesDB): Promise<void> {
    const routine = (await db.syncBackups.orderBy('createdAt').reverse().toArray()).filter((copy) => !copy.pinned);
    await db.syncBackups.bulkDelete(routine.slice(20).map((copy) => copy.id));
}

async function preserveConflict(db: FitnesDB, conflict: Conflict): Promise<void> {
    await db.transaction('rw', db.syncBackups, async () => {
        const common = { createdAt: Date.now(), pinned: 1, conflictId: conflict.id };
        await db.syncBackups.put({
            ...common,
            id: `${conflict.id}-local`,
            label: 'Conflict: this device',
            content: conflict.local.content,
            guidedCaches: guidedCaches(),
        });
        if (conflict.remote) {
            await db.syncBackups.put({
                ...common,
                id: `${conflict.id}-remote`,
                label: `Conflict: Dropbox ${conflict.remote.revision}`,
                content: conflict.remote.content,
            });
        }
    });
}

function unwrapBackup(content: string): unknown {
    const parsed = JSON.parse(content);
    return parsed.version === 1 && parsed.data ? parsed.data : parsed;
}

export type { LocalMetadata, RecoveryCopy, WriteGuard };
export {
    createLocalStore,
    decodeSnapshot,
    domainTables,
    encodeSnapshot,
    mutateRecord,
    rawData,
    readLocalMetadata,
    replaceLocalData,
    restoreBackup,
    synchronizeGuidedEpoch,
};
