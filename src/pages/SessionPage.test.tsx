/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { workoutSessionId } from '../domain/ids.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
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

async function reviewSession(): Promise<void> {
    renderSession();
    fireEvent.click(await screen.findByRole('button', { name: 'More', exact: true }));
    const menu = await screen.findByRole('dialog', { name: 'Workout actions' });
    fireEvent.animationEnd(menu);
    fireEvent.click(within(menu).getByRole('button', { name: 'Review', exact: true }));
}

it('shows only the current set and advances after a real result is persisted', async () => {
    renderSession();
    expect(await screen.findByRole('heading', { name: 'Bent-over row', level: 1 })).toBeTruthy();
    expect(screen.queryByText(/Ready when you are/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Log Bent-over row set 2' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(async () => expect((await db.sessions.get(sessionId))?.results).toHaveLength(1));
    await waitFor(() => expect(screen.getByText(/^Step 2 of /)).toBeTruthy());
    const saved = await db.sessions.get(sessionId);
    expect(saved?.results[0].sequenceEntryId).toBe(saved?.snapshot.sequence[0].id);
});

it('serializes rapid set logs and preserves both results', async () => {
    await reviewSession();
    const first = await screen.findByRole('button', { name: 'Log Bent-over row set 1' });
    const second = screen.getByRole('button', { name: 'Log Bent-over row set 2' });
    fireEvent.click(first);
    fireEvent.click(second);
    await waitFor(async () => expect((await db.sessions.get(sessionId))?.results).toHaveLength(2));
});

it('keeps a recorded set editor open across immediate persisted edits', async () => {
    await reviewSession();
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
