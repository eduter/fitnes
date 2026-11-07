/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { bodyweightMeasurementId } from '../domain/ids.ts';
import { templateUsesBodyweight } from '../domain/lookups.ts';
import { previewData } from '../preview/seedPreview.ts';
import { StartSessionPage } from './StartSessionPage.tsx';

beforeEach(async () => {
    const data = previewData(Date.now());
    data.sessions = [];
    data.bodyweightMeasurements = [
        { id: bodyweightMeasurementId.assert('older'), measuredAt: Date.now() - 2000, value: 80, unit: 'kg' },
        { id: bodyweightMeasurementId.assert('latest'), measuredAt: Date.now() - 1000, value: 181, unit: 'lb' },
        { id: bodyweightMeasurementId.assert('future'), measuredAt: Date.now() + 86400000, value: 90, unit: 'kg' },
    ];
    await importDatabase(db, data);
});
afterEach(cleanup);

function renderStart() {
    const history = createMemoryHistory();
    history.set({ value: '/sessions/start/preview-strength', replace: true });
    return render(() => (
        <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/sessions/start/:templateId" component={StartSessionPage} />
            <Route path="/sessions/:id" component={() => <h1>Workout running</h1>} />
        </MemoryRouter>
    ));
}

it('starts once without another prompt and snapshots the latest available reading', async () => {
    renderStart();
    await screen.findByRole('heading', { name: 'Workout running' });
    await waitFor(async () => expect(await db.sessions.count()).toBe(1));
    const [session] = await db.sessions.toArray();
    expect(session.bodyweight).toMatchObject({ value: 181, unit: 'lb', source: { measurementId: 'latest' } });
    expect(screen.queryByRole('button', { name: /Use latest|Do not attach|Record new/ })).toBeNull();
});

it('uses the latest reading even when the workout has no bodyweight sets', async () => {
    const plan = await db.templates.get('preview-strength');
    if (!plan) {
        throw new Error('Missing fixture workout');
    }
    plan.sets = plan.sets.filter((set) => set.exerciseId === 'ex-bent-over-row');
    plan.sequence = plan.sequence.filter((entry) => plan.sets.some((set) => set.id === entry.plannedSetId));
    plan.exercises = plan.exercises.filter((exercise) => exercise.id === 'ex-bent-over-row');
    expect(templateUsesBodyweight(plan)).toBe(false);
    await db.templates.put(plan);
    renderStart();
    await screen.findByRole('heading', { name: 'Workout running' });
    expect((await db.sessions.toArray())[0].bodyweight?.value).toBe(181);
});

it('starts normally without a snapshot when there is no weight history', async () => {
    await db.bodyweightMeasurements.clear();
    renderStart();
    await screen.findByRole('heading', { name: 'Workout running' });
    expect((await db.sessions.toArray())[0].bodyweight).toBeUndefined();
});
