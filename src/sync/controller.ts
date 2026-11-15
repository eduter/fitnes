import { createSignal } from 'solid-js';
import { onDataChange } from '../db/changes.ts';
import { db } from '../db/database.ts';
import { waitForDb } from '../db/dbLifecycle.ts';
import { createLocalStore, decodeSnapshot } from '../db/syncAdapter.ts';
import { createSyncEngine } from './core/engine.ts';
import { SyncFailure, type SyncResult } from './core/types.ts';
import { createDemoStore } from './demoStore.ts';
import { createDropboxAuthorization, type DropboxAuthorization } from './dropbox/auth.ts';
import { createDropboxStore, SYNC_PATH } from './dropbox/store.ts';
import { onLocalDataIdle } from './locks.ts';

const DEMO_SESSION = 'fitnes-sync-demo-session';

/** Own FitNES synchronization scheduling and expose a small reactive UI interface. */
function createAppSync(): SyncController {
    const clientId = import.meta.env.VITE_DROPBOX_APP_KEY ?? '';
    const demo = import.meta.env.VITE_SYNC_DEMO === 'true';
    const configured = import.meta.env.VITE_PREVIEW_DATA !== 'true' && (demo || Boolean(clientId));
    const [state, setState] = createSignal<SyncUiState>({
        status: 'disconnected',
        message: 'Dropbox is disconnected. Local data is available.',
    });
    const [connected, setConnected] = createSignal(false);
    let auth: DropboxAuthorization | undefined;
    let abort = new AbortController();
    let epoch = 0;
    let running: Promise<void> | undefined;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retries = 0;
    let stopped = true;
    let currentIdentity: string | null = null;

    function authorization(): DropboxAuthorization {
        auth ??= createDropboxAuthorization({
            clientId,
            baseUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href,
            local: localStorage,
            session: sessionStorage,
        });
        return auth;
    }
    function identity(): string | null {
        return demo ? localStorage.getItem(DEMO_SESSION) : (authorization().tokens()?.sessionId ?? null);
    }
    function cancel(): void {
        epoch++;
        abort.abort();
        abort = new AbortController();
        clearTimeout(timer);
        timer = undefined;
        pending = false;
    }
    function schedule(delay = 2000): void {
        if (stopped || !connected() || state().status === 'reauth') {
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            void sync();
        }, delay);
    }
    function presentFailure(cause: unknown): void {
        setState({
            status: cause instanceof SyncFailure && cause.kind === 'transient' ? 'offline' : 'error',
            message: cause instanceof Error ? cause.message : 'Could not synchronize. Local data is available.',
        });
    }

    async function execute(choice?: { id: string; value: 'local' | 'remote' }): Promise<void> {
        if (!configured || stopped) {
            return;
        }
        const session = identity();
        if (!session) {
            setConnected(false);
            return;
        }
        const operationEpoch = epoch;
        const operationSignal = abort.signal;
        const active = () => !stopped && epoch === operationEpoch && identity() === session;
        setConnected(true);
        if (!navigator.onLine) {
            setState({
                ...state(),
                status: 'offline',
                message: 'Offline. Local changes are saved and will sync when connected.',
            });
            return;
        }
        setState({ ...state(), status: 'syncing', message: 'Syncing with Dropbox…' });
        try {
            await waitForDb();
            if (!navigator.locks) {
                throw new Error(
                    'Browser storage locks are unavailable. Open FitNES in current Chrome over HTTPS to sync.'
                );
            }
            await navigator.locks.request('fitnes-dropbox-sync', { signal: operationSignal }, async () => {
                if (!active()) {
                    return;
                }
                const credentials = demo ? null : authorization().tokens();
                const scope = demo ? 'demo:fitnes' : `dropbox:${clientId}:${credentials?.accountId}:${SYNC_PATH}`;
                const local = createLocalStore(db, scope, active);
                const saved = await local.checkpoint();
                const remote = demo
                    ? createDemoStore(localStorage)
                    : createDropboxStore(authorization().connection(operationSignal));
                const engine = createSyncEngine({ local, remote, decode: decodeSnapshot, active });
                const result = choice ? await engine.resolve(choice.id, choice.value) : await engine.sync();
                if (epoch !== operationEpoch || stopped) {
                    return;
                }
                setState({
                    ...result,
                    lastSyncedAt: result.lastSyncedAt ?? saved.lastSyncedAt,
                    conflict: result.status === 'synced' ? undefined : (result.conflict ?? saved.conflict),
                });
                setConnected(Boolean(identity()));
                if (result.status === 'offline' && retries < 5) {
                    const jitter = 0.75 + Math.random() * 0.5;
                    schedule(Math.max(result.retryAfterMs ?? 0, Math.min(60_000, 1000 * 2 ** retries++) * jitter));
                } else if (result.status === 'pending') {
                    schedule(500);
                } else {
                    retries = 0;
                }
            });
        } catch (cause) {
            if (epoch === operationEpoch && !stopped) {
                presentFailure(cause);
            }
        }
    }

    async function run(choice?: { id: string; value: 'local' | 'remote' }): Promise<void> {
        if (running) {
            pending = true;
            return running;
        }
        clearTimeout(timer);
        timer = undefined;
        running = execute(choice);
        try {
            await running;
        } finally {
            running = undefined;
            if (pending) {
                pending = false;
                schedule(0);
            }
        }
    }
    async function sync(): Promise<void> {
        await run();
    }
    async function resolve(id: string, choice: 'local' | 'remote'): Promise<void> {
        await run({ id, value: choice });
    }

    async function connect(): Promise<void> {
        try {
            if (!configured) {
                return;
            }
            if (demo) {
                cancel();
                localStorage.setItem(DEMO_SESSION, crypto.randomUUID());
                currentIdentity = identity();
                setConnected(true);
                await sync();
                return;
            }
            window.location.assign(await authorization().start());
        } catch (cause) {
            presentFailure(cause);
        }
    }
    function disconnect(): void {
        cancel();
        if (demo) {
            localStorage.removeItem(DEMO_SESSION);
        } else {
            authorization().disconnect();
        }
        currentIdentity = null;
        setConnected(false);
        setState({ status: 'disconnected', message: 'Dropbox is disconnected. Local data is available.' });
    }
    function storageChanged(): void {
        const next = identity();
        if (next === currentIdentity) {
            return;
        }
        cancel();
        currentIdentity = next;
        setConnected(Boolean(next));
        setState({
            status: next ? 'pending' : 'disconnected',
            message: next ? 'Checking this Dropbox connection…' : 'Dropbox is disconnected. Local data is available.',
        });
        if (next) {
            schedule(0);
        }
    }
    function resume(): void {
        if (document.visibilityState === 'visible') {
            retries = 0;
            schedule(0);
        }
    }
    function changed(): void {
        if (!connected()) {
            return;
        }
        if (!['syncing', 'conflict', 'reauth'].includes(state().status)) {
            setState({ ...state(), status: 'pending', message: 'Local changes are waiting to upload.' });
        }
        schedule();
    }

    function start(): () => void {
        if (!configured) {
            return () => {};
        }
        stopped = false;
        currentIdentity = identity();
        setConnected(Boolean(currentIdentity));
        const stopChanges = onDataChange(changed);
        const stopIdle = onLocalDataIdle(() => {
            if (state().status === 'waiting') {
                schedule(0);
            }
        });
        window.addEventListener('online', resume);
        window.addEventListener('pageshow', resume);
        window.addEventListener('storage', storageChanged);
        document.addEventListener('visibilitychange', resume);
        const periodic = setInterval(resume, 60_000);
        const startEpoch = epoch;
        void (async () => {
            try {
                if (
                    !demo &&
                    (new URLSearchParams(window.location.search).has('code') ||
                        new URLSearchParams(window.location.search).has('error'))
                ) {
                    try {
                        await authorization().finish(window.location.search);
                    } finally {
                        window.history.replaceState(window.history.state, '', import.meta.env.BASE_URL);
                    }
                }
                if (epoch !== startEpoch || stopped) {
                    return;
                }
                currentIdentity = identity();
                setConnected(Boolean(currentIdentity));
                if (currentIdentity) {
                    await sync();
                }
            } catch (cause) {
                if (epoch === startEpoch && !stopped) {
                    presentFailure(cause);
                }
            }
        })();
        return () => {
            stopped = true;
            cancel();
            clearInterval(periodic);
            stopChanges();
            stopIdle();
            window.removeEventListener('online', resume);
            window.removeEventListener('pageshow', resume);
            window.removeEventListener('storage', storageChanged);
            document.removeEventListener('visibilitychange', resume);
        };
    }
    return {
        state,
        connected,
        configured: () => configured,
        demo: () => demo,
        connect,
        disconnect,
        sync,
        resolve,
        start,
    };
}

/** UI status adds the active request state to engine outcomes. */
interface SyncUiState extends Omit<SyncResult, 'status'> {
    status: SyncResult['status'] | 'syncing';
}

/** FitNES-facing actions and reactive state; transport details stay in the adapters. */
interface SyncController {
    state(): SyncUiState;
    connected(): boolean;
    configured(): boolean;
    demo(): boolean;
    connect(): Promise<void>;
    disconnect(): void;
    sync(): Promise<void>;
    resolve(id: string, choice: 'local' | 'remote'): Promise<void>;
    start(): () => void;
}

const appSync = createAppSync();

export type { SyncController, SyncUiState };
export { appSync, createAppSync };
