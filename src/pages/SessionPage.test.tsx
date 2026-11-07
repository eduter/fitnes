/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
import { workoutSessionId } from '../domain/ids.ts';
import { previewData } from '../preview/seedPreview.ts';
import { SessionPage } from './SessionPage.tsx';

const sessionId = workoutSessionId.assert('test-live-session');

beforeEach(async () => {
    const data = previewData(Date.now());
    const template = data.templates[0];
    data.sessions.push(createSessionFromTemplate({ id: sessionId, template, startedAt: Date.now() }));
    await importDatabase(db, data);
});
afterEach(cleanup);

function renderSession() {
    const history = createMemoryHistory();
    history.set({ value: `/sessions/${sessionId}`, replace: true });
    return render(() => (
        <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/sessions/:id" component={SessionPage} />
        </MemoryRouter>
    ));
}

it('serializes rapid set logs and preserves both results', async () => {
    renderSession();
    const first = await screen.findByRole('button', { name: 'Log Bent-over row set 1' });
    const second = screen.getByRole('button', { name: 'Log Bent-over row set 2' });
    fireEvent.click(first);
    fireEvent.click(second);
    await waitFor(async () => expect((await db.sessions.get(sessionId))?.results).toHaveLength(2));
});

it('keeps a recorded set editor open across immediate persisted edits', async () => {
    renderSession();
    fireEvent.click(await screen.findByRole('button', { name: 'Log Bent-over row set 1' }));
    await screen.findByRole('button', { name: 'Clear Bent-over row set 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Bent-over row set 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Bent-over row set 1' });
    fireEvent.animationEnd(dialog);
    const before = (await db.sessions.get(sessionId))?.results[0].measurement;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase reps' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase reps' }));
    await waitFor(async () => {
        const result = (await db.sessions.get(sessionId))?.results[0].measurement;
        expect(result).toMatchObject({ reps: (before && 'reps' in before ? before.reps : 0) + 2 });
    });
    expect(screen.getByRole('dialog', { name: 'Edit Bent-over row set 1' })).toBe(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'End', exact: true }));
    expect(dialog.dataset.phase).toBe('closing');
    expect(dialog.textContent).toContain('Bent-over row');
});
