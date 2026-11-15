import { test, expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';

interface RemoteFile {
    content: string;
    revision: string;
}

function fakeDropbox() {
    const files = new Map<string, RemoteFile>();
    let expired = false;
    let revision = 0;
    const requests: string[] = [];
    const route = async (route: Route) => {
        const url = new URL(route.request().url());
        if (url.hostname === '127.0.0.1') {
            await route.continue();
            return;
        }
        if (!['api.dropboxapi.com', 'content.dropboxapi.com'].includes(url.hostname)) {
            await route.abort();
            return;
        }
        requests.push(url.pathname);
        if (url.pathname.endsWith('/oauth2/token')) {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'invalid_grant' }),
            });
            return;
        }
        if (expired) {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error_summary: 'expired_access_token' }),
            });
            return;
        }
        const argument = JSON.parse(route.request().headers()['dropbox-api-arg'] ?? route.request().postData() ?? '{}');
        const file = files.get(argument.path);
        const json = (status: number, body: unknown) =>
            route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname.endsWith('/download')) {
            if (!file) {
                await json(409, { error: { '.tag': 'path', path: { '.tag': 'not_found' } } });
                return;
            }
            await route.fulfill({
                status: 200,
                headers: {
                    'Access-Control-Expose-Headers': 'Dropbox-API-Result',
                    'Dropbox-API-Result': JSON.stringify({
                        name: 'data.json',
                        path_lower: argument.path,
                        id: 'id:fake',
                        rev: file.revision,
                        size: file.content.length,
                    }),
                },
                contentType: 'application/octet-stream',
                body: file.content,
            });
            return;
        }
        if (url.pathname.endsWith('/get_metadata')) {
            await json(
                file ? 200 : 409,
                file
                    ? { '.tag': 'file', rev: file.revision, name: 'backup.json' }
                    : { error: { '.tag': 'path', path: { '.tag': 'not_found' } } }
            );
            return;
        }
        if (url.pathname.endsWith('/upload')) {
            const mode = argument.mode;
            if ((mode['.tag'] === 'add' && file) || (mode['.tag'] === 'update' && file?.revision !== mode.update)) {
                await json(409, {
                    error: { '.tag': 'path', reason: { '.tag': 'conflict', conflict: { '.tag': 'file' } } },
                });
                return;
            }
            const next = {
                content: route.request().postDataBuffer()?.toString('utf8') ?? '',
                revision: `r${++revision}`,
            };
            files.set(argument.path, next);
            await json(200, { rev: next.revision, id: 'id:fake', name: 'data.json', size: next.content.length });
            return;
        }
        throw new Error(`Unmocked Dropbox operation: ${url.pathname}`);
    };
    return {
        files,
        requests,
        route,
        expire() {
            expired = true;
        },
        edit(edit: (document: { data: { exercises: { id: string; name: string }[] } }) => void) {
            const current = files.get('/fitnes/data.json');
            if (!current) {
                throw new Error('missing fake remote');
            }
            const document = JSON.parse(current.content);
            edit(document);
            files.set('/fitnes/data.json', { content: JSON.stringify(document), revision: `r${++revision}` });
        },
    };
}

async function device(
    browser: Browser,
    remote: ReturnType<typeof fakeDropbox>
): Promise<{ context: BrowserContext; page: Page; setOffline(value: boolean): void }> {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    let offline = false;
    await context.route('**/*', async (route) => {
        if (offline && new URL(route.request().url()).hostname.endsWith('dropboxapi.com')) {
            await route.abort('internetdisconnected');
            return;
        }
        await remote.route(route);
    });
    await context.addInitScript(() => {
        if (location.hostname !== '127.0.0.1') {
            return;
        }
        if (!localStorage.getItem('fitnes-dropbox-v1')) {
            localStorage.setItem(
                'fitnes-dropbox-v1',
                JSON.stringify({
                    clientId: 'browser-test',
                    sessionId: 'test-session',
                    accountId: 'test-account',
                    accessToken: 'fake-access',
                    refreshToken: 'fake-refresh',
                    expiresAt: Date.now() + 3_600_000,
                })
            );
        }
    });
    const page = await context.newPage();
    await page.goto('/data');
    await expect(page.getByText('Up to date with Dropbox.', { exact: true })).toBeVisible();
    return {
        context,
        page,
        setOffline(value: boolean) {
            offline = value;
        },
    };
}

async function rename(page: Page, name: string): Promise<void> {
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page
        .getByRole('button', { name: /^Edit / })
        .first()
        .click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
}
async function finishEdit(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Sync now', exact: true }).click();
}

test('two devices preserve competing edits and resolve an explicitly reviewed snapshot', async ({ browser }) => {
    const remote = fakeDropbox();
    const first = await device(browser, remote);
    const second = await device(browser, remote);
    first.setOffline(true);
    await rename(first.page, 'Local device change');
    second.setOffline(true);
    await rename(second.page, 'Other device change');
    await second.page.getByRole('button', { name: 'End', exact: true }).click();
    second.setOffline(false);
    await second.page.getByRole('button', { name: 'Settings', exact: true }).click();
    await second.page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(second.page.getByText('Up to date with Dropbox.', { exact: true })).toBeVisible();
    first.setOffline(false);
    await finishEdit(first.page);
    await expect(
        first.page.getByText('Both copies changed. Choose which complete dataset to use.', { exact: true })
    ).toBeVisible();
    await first.page.setViewportSize({ width: 256, height: 900 });
    await first.page.evaluate(() => document.fonts.ready);
    await first.page.screenshot({ path: 'work/sync-conflict.png', fullPage: true, animations: 'disabled' });
    await first.page.getByRole('button', { name: 'Use this device', exact: true }).click();
    await first.page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(first.page.getByText('Up to date with Dropbox.', { exact: true })).toBeVisible();
    expect(remote.files.get('/fitnes/data.json')?.content).toContain('Local device change');
    expect([...remote.files.keys()].some((path) => path.includes('/backups/conflict-'))).toBe(true);
    await first.page.getByRole('button', { name: 'Recovery copies', exact: true }).click();
    await expect(first.page.getByText('Conflict: this device', { exact: true })).toBeVisible();
    await first.page.screenshot({ path: 'work/sync-recovery.png', fullPage: true, animations: 'disabled' });
    first.setOffline(true);
    await first.page
        .getByText(/^Conflict: Dropbox /)
        .locator('..')
        .getByRole('button', { name: 'Restore', exact: true })
        .click();
    await first.page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(
        first.page.getByText('Restored local data. Dropbox sync will compare it before uploading.', { exact: true })
    ).toBeVisible();
    await first.page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await expect(first.page.getByText('Other device change', { exact: true })).toBeVisible();
    await first.context.close();
    await second.context.close();
});

test('an editor in another tab defers a remote replacement until it closes', async ({ browser }) => {
    const remote = fakeDropbox();
    const first = await device(browser, remote);
    const editor = await first.context.newPage();
    await editor.goto('/exercises');
    await editor
        .getByRole('button', { name: /^Edit / })
        .first()
        .click();
    const previous = await editor.getByRole('textbox', { name: 'Name', exact: true }).inputValue();
    remote.edit((document) => {
        document.data.exercises[0].name = 'Changed elsewhere';
    });
    await first.page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(first.page.getByText(/Dropbox changes are waiting/)).toBeVisible();
    await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(previous);
    await editor.getByRole('button', { name: 'End', exact: true }).click();
    await expect(first.page.getByText('Up to date with Dropbox.', { exact: true })).toBeVisible();
    await first.page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await expect(first.page.getByText('Changed elsewhere', { exact: true })).toBeVisible();
    await first.context.close();
});

test('offline changes survive reload and disconnect leaves local data usable', async ({ browser }) => {
    const remote = fakeDropbox();
    const first = await device(browser, remote);
    first.setOffline(true);
    await rename(first.page, 'Offline saved change');
    await finishEdit(first.page);
    await expect(first.page.getByText(/Dropbox is unreachable/)).toBeVisible();
    await first.page.reload();
    await expect(first.page.getByText(/Dropbox is unreachable/)).toBeVisible();
    first.setOffline(false);
    await first.page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(first.page.getByText('Up to date with Dropbox.', { exact: true })).toBeVisible();
    expect(remote.files.get('/fitnes/data.json')?.content).toContain('Offline saved change');
    const before = remote.requests.length;
    await first.page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await first.page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await expect(first.page.getByText('Offline saved change', { exact: true })).toBeVisible();
    expect(remote.requests.length).toBe(before);
    await first.context.close();
});

test('expired authorization asks for reconnect while local data stays usable', async ({ browser }) => {
    const remote = fakeDropbox();
    const first = await device(browser, remote);
    remote.expire();
    await first.page.getByRole('button', { name: 'Sync now', exact: true }).click();
    await expect(first.page.getByRole('button', { name: 'Reconnect Dropbox', exact: true })).toBeVisible();
    await first.page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await expect(first.page.getByRole('heading', { name: 'Air squat', exact: true })).toBeVisible();
    await first.context.close();
});
