import type { Dropbox, DropboxResponse } from 'dropbox';
import { SyncFailure } from '../core/types.ts';

const TOKEN_KEY = 'fitnes-dropbox-v1';
const AUTH_KEY = 'fitnes-dropbox-authorization';

/** Create browser OAuth authorization without exposing tokens outside the Dropbox adapter. */
function createDropboxAuthorization(options: AuthorizationOptions): DropboxAuthorization {
    const { clientId, baseUrl, local, session, fetcher = fetch } = options;
    function tokens(): DropboxTokens | null {
        try {
            const value = JSON.parse(local.getItem(TOKEN_KEY) ?? 'null') as DropboxTokens | null;
            if (
                value?.clientId !== clientId ||
                !value?.accessToken ||
                !value.refreshToken ||
                !value.accountId ||
                !value.sessionId ||
                !Number.isFinite(value.expiresAt)
            ) {
                return null;
            }
            return value;
        } catch {
            return null;
        }
    }

    async function start(): Promise<string> {
        if (!clientId) {
            throw new Error('Dropbox is not configured for this build.');
        }
        const { DropboxAuth } = await import('dropbox');
        const auth = new DropboxAuth({ clientId, fetch: fetcher });
        const state = crypto.randomUUID();
        const url = await auth.getAuthenticationUrl(
            baseUrl,
            state,
            'code',
            'offline',
            ['account_info.read', 'files.metadata.read', 'files.content.read', 'files.content.write'],
            'none',
            true
        );
        session.setItem(AUTH_KEY, JSON.stringify({ state, verifier: auth.getCodeVerifier(), createdAt: Date.now() }));
        return url;
    }

    async function finish(query: string): Promise<boolean> {
        const params = new URLSearchParams(query);
        if (!params.has('code') && !params.has('error')) {
            return false;
        }
        const pending = JSON.parse(session.getItem(AUTH_KEY) ?? 'null') as {
            state: string;
            verifier: string;
            createdAt: number;
        } | null;
        if (!pending || pending.state !== params.get('state') || Date.now() - pending.createdAt > 600_000) {
            throw new Error('Dropbox authorization state is missing or expired. Connect again.');
        }
        session.removeItem(AUTH_KEY);
        if (params.has('error')) {
            throw new Error('Dropbox authorization was cancelled. Local data is available.');
        }
        const code = params.get('code');
        if (!code) {
            throw new Error('Dropbox did not return an authorization code.');
        }
        const { Dropbox, DropboxAuth } = await import('dropbox');
        const auth = new DropboxAuth({ clientId, fetch: timedFetch(fetcher) });
        auth.setCodeVerifier(pending.verifier);
        try {
            const response = await auth.getAccessTokenFromCode(baseUrl, code);
            const result = response.result as { access_token?: string; refresh_token?: string; expires_in?: number };
            if (!result.access_token || !result.refresh_token || !result.expires_in) {
                throw new Error('Dropbox did not grant offline access. Connect again.');
            }
            const client = new Dropbox({ accessToken: result.access_token, fetch: timedFetch(fetcher) });
            const account = await client.usersGetCurrentAccount();
            local.setItem(
                TOKEN_KEY,
                JSON.stringify({
                    clientId,
                    sessionId: crypto.randomUUID(),
                    accessToken: result.access_token,
                    refreshToken: result.refresh_token,
                    expiresAt: Date.now() + result.expires_in * 1000,
                    accountId: account.result.account_id,
                } satisfies DropboxTokens)
            );
            return true;
        } catch (cause) {
            throw classifyDropboxError(cause);
        }
    }

    function connection(signal: AbortSignal): DropboxConnection {
        let credentials = tokens();
        if (!credentials) {
            throw new SyncFailure('auth', 'Connect to Dropbox to sync.');
        }
        const sessionId = credentials.sessionId;
        const requestFetch = timedFetch(fetcher, signal);
        function active(): boolean {
            return !signal.aborted && tokens()?.sessionId === sessionId;
        }
        function assertActive(): void {
            if (!active()) {
                throw new SyncFailure('permanent', 'Dropbox connection changed. Sync stopped.');
            }
        }
        async function refresh(): Promise<void> {
            assertActive();
            const latest = tokens();
            if (!latest) {
                throw new SyncFailure('auth', 'Reconnect Dropbox to sync.');
            }
            const { DropboxAuth } = await import('dropbox');
            assertActive();
            const auth = new DropboxAuth({ clientId, refreshToken: latest.refreshToken, fetch: requestFetch });
            try {
                await auth.refreshAccessToken();
                assertActive();
                credentials = {
                    ...latest,
                    accessToken: auth.getAccessToken(),
                    expiresAt: auth.getAccessTokenExpiresAt().getTime(),
                };
                local.setItem(TOKEN_KEY, JSON.stringify(credentials));
            } catch (cause) {
                const error = classifyDropboxError(cause);
                if (error.kind === 'auth' && active()) {
                    local.removeItem(TOKEN_KEY);
                }
                throw error;
            }
        }
        async function run<T>(
            operation: (client: Dropbox) => Promise<DropboxResponse<T>>
        ): Promise<DropboxResponse<T>> {
            assertActive();
            credentials = tokens();
            if (!credentials) {
                throw new SyncFailure('auth', 'Reconnect Dropbox to sync.');
            }
            const { Dropbox } = await import('dropbox');
            assertActive();
            let refreshed = false;
            if (credentials.expiresAt <= Date.now() + 60_000) {
                await refresh();
                refreshed = true;
            }
            for (;;) {
                assertActive();
                try {
                    const result = await operation(
                        new Dropbox({ accessToken: credentials?.accessToken, fetch: requestFetch })
                    );
                    assertActive();
                    return result;
                } catch (cause) {
                    const error = classifyDropboxError(cause);
                    if (error.kind !== 'auth') {
                        throw error;
                    }
                    if (refreshed) {
                        if (active()) {
                            local.removeItem(TOKEN_KEY);
                        }
                        throw error;
                    }
                    await refresh();
                    refreshed = true;
                }
            }
        }
        return { run };
    }

    function disconnect(): void {
        local.removeItem(TOKEN_KEY);
        session.removeItem(AUTH_KEY);
    }

    return { tokens, start, finish, connection, disconnect };
}

/** Account-scoped persisted browser credentials. Never include this object in exports, logs, or recovery files. */
interface DropboxTokens {
    clientId: string;
    sessionId: string;
    accountId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

/** Browser dependencies are injectable so authentication tests never contact Dropbox. */
interface AuthorizationOptions {
    clientId: string;
    baseUrl: string;
    local: Storage;
    session: Storage;
    fetcher?: typeof fetch;
}

/** Authorization lifecycle and request execution for one FitNES app registration. */
interface DropboxAuthorization {
    tokens(): DropboxTokens | null;
    start(): Promise<string>;
    finish(query: string): Promise<boolean>;
    connection(signal: AbortSignal): DropboxConnection;
    disconnect(): void;
}

/** Authenticated SDK requests with bounded refresh and cancellation. */
interface DropboxConnection {
    run<T>(operation: (client: Dropbox) => Promise<DropboxResponse<T>>): Promise<DropboxResponse<T>>;
}

/** Convert provider failures to actionable errors without echoing request payloads or credentials. */
function classifyDropboxError(cause: unknown): SyncFailure {
    if (cause instanceof SyncFailure) {
        return cause;
    }
    const error = cause as {
        status?: number;
        error?: { error?: unknown; retry_after?: number };
        headers?: Headers | Record<string, string>;
    } | null;
    if (error?.status === 401 || (error?.status === 400 && error.error?.error === 'invalid_grant')) {
        return new SyncFailure('auth', 'Dropbox access expired. Reconnect to sync.');
    }
    if (error?.status === 429) {
        const header =
            error.headers instanceof Headers ? error.headers.get('Retry-After') : error.headers?.['retry-after'];
        const seconds = Number(error.error?.retry_after ?? header ?? 1);
        return new SyncFailure(
            'transient',
            'Dropbox is busy. Sync will retry.',
            Number.isFinite(seconds) ? Math.max(1, seconds) * 1000 : 1000
        );
    }
    if (!error?.status || error.status >= 500) {
        return new SyncFailure('transient', 'Dropbox is unreachable. Local changes are saved; sync will retry.');
    }
    if (error.status === 409) {
        // The store needs the structured error to distinguish a missing file from other path failures
        return new DropboxPathFailure(cause);
    }
    return new SyncFailure('permanent', `Dropbox request failed (${error.status}). Local data is available.`);
}

/** Retain only the structured Dropbox path error needed by the storage adapter. */
class DropboxPathFailure extends SyncFailure {
    readonly detail: unknown;
    constructor(detail: unknown) {
        super('permanent', 'Dropbox path could not be accessed. Sync stopped.');
        this.detail = detail;
    }
}

/** Inspect a precise Dropbox path error rather than treating HTTP 409 as file-not-found. */
function dropboxPathTag(cause: unknown, outer: string): string | undefined {
    const detail = cause instanceof DropboxPathFailure ? cause.detail : cause;
    const error = (detail as { error?: { error?: Record<string, unknown> } } | null)?.error?.error;
    if (error?.['.tag'] !== outer) {
        return undefined;
    }
    const path = (error[outer] ?? error.reason) as { '.tag'?: string } | undefined;
    return path?.['.tag'];
}

function timedFetch(fetcher: typeof fetch, signal?: AbortSignal): typeof fetch {
    return (input, init) =>
        fetcher(input, {
            ...init,
            signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(20_000)]),
        });
}

export type { DropboxAuthorization, DropboxConnection, DropboxTokens };
export { classifyDropboxError, createDropboxAuthorization, dropboxPathTag };
