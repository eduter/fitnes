/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { wristCurl } from '../domain/examples.ts';
import { workoutSessionId } from '../domain/ids.ts';
import { draftResultFromPrescription } from '../domain/recordSession.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
import { previewData } from '../preview/seedPreview.ts';
import { SessionPage } from './SessionPage.tsx';

const sessionId = workoutSessionId.assert('test-live-session');

beforeEach(async () => {
    localStorage.clear();
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

it('keeps guided edits in Review and uses newer Review edits when returning to Track', async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) {
        throw new Error('missing test session');
    }
    const entry = session.snapshot.sequence[0];
    const set = session.snapshot.sets.find((set) => set.id === entry.plannedSetId);
    if (!set) {
        throw new Error('missing test set');
    }
    const draft = draftResultFromPrescription(entry.id, set.prescription, session.startedAt);
    draft.measurement = { measurement: 'repetitions', countBasis: 'total', reps: 3 };
    localStorage.setItem(
        `fitnes-guided:${sessionId}:${entry.id}`,
        JSON.stringify({ started: false, elapsed: 0, side: 'left', manual: true, draft })
    );

    await reviewSession();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Bent-over row set 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Bent-over row set 1' });
    fireEvent.animationEnd(dialog);
    expect(within(dialog).getByRole('button', { name: 'reps: 003. Edit number' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Increase reps' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'Track', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(async () => {
        expect((await db.sessions.get(sessionId))?.results[0]?.measurement).toMatchObject({ reps: 4 });
    });
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

it('finishes both sides of unilateral wrist curls before persisting and advancing', async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) {
        throw new Error('missing test session');
    }
    const first = session.snapshot.sets[0];
    session.snapshot.exercises.push(structuredClone(wristCurl));
    first.exerciseId = wristCurl.id;
    first.prescription.executionMode = 'unilateral';
    first.prescription.load = { kind: 'external', basis: 'perSide', weight: { value: 10, unit: 'kg' } };
    await db.sessions.put(session);

    renderSession();
    expect(await screen.findByRole('heading', { name: 'Wrist curl' })).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    expect(screen.getByText('Right')).toBeTruthy();
    expect((await db.sessions.get(sessionId))?.results).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(async () => expect((await db.sessions.get(sessionId))?.results).toHaveLength(1));
    expect(await screen.findByRole('heading', { name: 'Bent-over row' })).toBeTruthy();
    expect(screen.getByText(/^Step 2 of /)).toBeTruthy();
});
