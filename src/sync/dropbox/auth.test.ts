/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyDropboxError, createDropboxAuthorization } from './auth.ts';

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/fitnes/');
});

function fixture() {
    const fetcher = vi.fn<typeof fetch>();
    const auth = createDropboxAuthorization({
        clientId: 'fitnes-key',
        baseUrl: new URL('/fitnes/', window.location.origin).href,
        local: localStorage,
        session: sessionStorage,
        fetcher,
    });
    return { auth, fetcher };
}

describe('Dropbox authorization', () => {
    it('requests PKCE, offline access, and a one-use state tied to a stable callback', async () => {
        const { auth } = fixture();
        const url = new URL(await auth.start());
        expect(url.searchParams.get('redirect_uri')).toBe(new URL('/fitnes/', window.location.origin).href);
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');
        expect(url.searchParams.get('token_access_type')).toBe('offline');
        expect(url.searchParams.get('state')).toBeTruthy();
    });
    it('rejects an unsolicited or mismatched callback before making a request', async () => {
        const { auth, fetcher } = fixture();
        await auth.start();
        await expect(auth.finish('?code=code&state=wrong')).rejects.toThrow('state');
        expect(fetcher).not.toHaveBeenCalled();
        expect(auth.tokens()).toBeNull();
    });
    it('exchanges a valid callback, scopes credentials to the app/account, and consumes state', async () => {
        const { auth, fetcher } = fixture();
        const url = new URL(await auth.start());
        fetcher.mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    access_token: 'access',
                    refresh_token: 'refresh',
                    expires_in: 3600,
                    account_id: 'account-a',
                }),
                { status: 200 }
            )
        );
        fetcher.mockResolvedValueOnce(
            new Response(JSON.stringify({ account_id: 'account-a', email: 'user@example.com' }), { status: 200 })
        );
        const query = `?code=code&state=${url.searchParams.get('state')}`;
        await auth.finish(query);
        expect(auth.tokens()).toMatchObject({
            clientId: 'fitnes-key',
            accountId: 'account-a',
            refreshToken: 'refresh',
        });
        await expect(auth.finish(query)).rejects.toThrow('state');
        auth.disconnect();
        expect(auth.tokens()).toBeNull();
    });
    it('refreshes a 401 once and retains credentials after transient refresh failure', async () => {
        const { auth, fetcher } = fixture();
        const url = new URL(await auth.start());
        fetcher.mockResolvedValueOnce(
            new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }), {
                status: 200,
            })
        );
        fetcher.mockResolvedValueOnce(
            new Response(JSON.stringify({ account_id: 'account-a', email: 'user@example.com' }), { status: 200 })
        );
        await auth.finish(`?code=code&state=${url.searchParams.get('state')}`);
        const session = auth.connection(new AbortController().signal);
        let requests = 0;
        fetcher.mockRejectedValueOnce(new TypeError('offline'));
        await expect(
            session.run(async () => {
                requests++;
                throw { status: 401 };
            })
        ).rejects.toMatchObject({ kind: 'transient' });
        expect(requests).toBe(1);
        expect(auth.tokens()?.refreshToken).toBe('refresh');
    });
    it('maps rate limiting, authentication, and server failures without logging tokens', () => {
        expect(classifyDropboxError({ status: 429, error: { retry_after: 7 } })).toMatchObject({
            kind: 'transient',
            retryAfterMs: 7000,
        });
        expect(classifyDropboxError({ status: 401 })).toMatchObject({ kind: 'auth' });
        expect(classifyDropboxError({ status: 503 })).toMatchObject({ kind: 'transient' });
        expect(classifyDropboxError({ status: 400, error: { error: 'invalid_grant' } })).toMatchObject({
            kind: 'auth',
        });
    });
});

function storedSession(): void {
    localStorage.setItem(
        'fitnes-dropbox-v1',
        JSON.stringify({
            clientId: 'fitnes-key',
            sessionId: 'session',
            accountId: 'account-a',
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresAt: Date.now() + 3_600_000,
        })
    );
}

it('refreshes and retries a rejected request exactly once', async () => {
    storedSession();
    const { auth, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'refreshed', expires_in: 3600 }), { status: 200 })
    );
    let requests = 0;
    const session = auth.connection(new AbortController().signal);
    const response = await session.run(async () => {
        if (++requests === 1) {
            throw { status: 401 };
        }
        return { status: 200, headers: new Headers(), result: { ok: true } };
    });
    expect(response.result).toEqual({ ok: true });
    expect(requests).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(auth.tokens()?.accessToken).toBe('refreshed');
});

it('requires reconnection when Dropbox rejects a refresh token', async () => {
    storedSession();
    const { auth, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
    await expect(
        auth.connection(new AbortController().signal).run(async () => {
            throw { status: 401 };
        })
    ).rejects.toMatchObject({ kind: 'auth' });
    expect(auth.tokens()).toBeNull();
});

it('never resurrects disconnected credentials when a refresh finishes late', async () => {
    storedSession();
    const { auth, fetcher } = fixture();
    let finish!: (response: Response) => void;
    fetcher.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    const operation = auth.connection(new AbortController().signal).run(async () => {
        throw { status: 401 };
    });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    auth.disconnect();
    finish(new Response(JSON.stringify({ access_token: 'late-token', expires_in: 3600 }), { status: 200 }));
    await expect(operation).rejects.toThrow('connection changed');
    expect(auth.tokens()).toBeNull();
});
