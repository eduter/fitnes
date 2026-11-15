/** Validated application content; fingerprints exclude incidental metadata. */
interface Snapshot {
    content: string;
    fingerprint: string;
    empty: boolean;
}

/** A consistent local read paired with its transaction generation. */
interface LocalSnapshot extends Snapshot {
    generation: number;
}

/** Exact remote bytes paired with the revision returned by the same download. */
interface RemoteSnapshot {
    content: string;
    revision: string;
}

/** Reviewed candidates; an absent remote represents a deleted sync file. */
interface Conflict {
    id: string;
    local: LocalSnapshot;
    remote: RemoteSnapshot | null;
}

/** Durable state scoped to one provider account and document. */
interface Checkpoint {
    key: string;
    baseline?: { fingerprint: string; revision: string };
    journal?: { snapshot: Snapshot; expectedRevision: string | null };
    conflict?: Conflict;
    lastSyncedAt?: number;
}

/** Application-owned atomic persistence and recovery operations. */
interface LocalStore {
    read(): Promise<LocalSnapshot>;
    checkpoint(): Promise<Checkpoint>;
    saveCheckpoint(value: Checkpoint): Promise<void>;
    preserveConflict(value: Conflict): Promise<void>;
    replace(expectedGeneration: number, snapshot: Snapshot, checkpoint: Checkpoint): Promise<boolean>;
}

/** Provider-owned conditional writes and immutable recovery copies. */
interface RemoteStore {
    read(): Promise<RemoteSnapshot | null>;
    write(content: string, expectedRevision: string | null): Promise<RemoteSnapshot>;
    backup(snapshot: RemoteSnapshot, exact: boolean): Promise<void>;
}

/** User-visible result, independent of a framework or transport. */
interface SyncResult {
    status: 'synced' | 'pending' | 'waiting' | 'conflict' | 'offline' | 'reauth' | 'error' | 'disconnected';
    message: string;
    conflict?: Conflict;
    lastSyncedAt?: number;
    retryAfterMs?: number;
}

/** Typed provider failures let scheduling distinguish retryable and permanent problems. */
class SyncFailure extends Error {
    readonly kind: 'changed' | 'transient' | 'auth' | 'permanent';
    readonly retryAfterMs?: number;

    constructor(kind: SyncFailure['kind'], message: string, retryAfterMs?: number) {
        super(message);
        this.name = 'SyncFailure';
        this.kind = kind;
        this.retryAfterMs = retryAfterMs;
    }
}

export type { Checkpoint, Conflict, LocalSnapshot, LocalStore, RemoteSnapshot, RemoteStore, Snapshot, SyncResult };
export { SyncFailure };
