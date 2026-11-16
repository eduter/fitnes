/** @vitest-environment jsdom */
import { MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { formatDate } from '../utils/datetime.ts';
import { BodyweightPage } from './BodyweightPage.tsx';
import { ExerciseListPage } from './ExerciseListPage.tsx';

beforeEach(async () => {
    localStorage.removeItem('fitnes-mass-unit');
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

it('filters both weight series together while retaining editable reading history', async () => {
    await db.bodyweightMeasurements.put({
        id: 'bw-old',
        measuredAt: Date.now() - 200 * 86_400_000,
        value: 90,
        unit: 'kg',
    });
    render(() => (
        <MemoryRouter root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/" component={BodyweightPage} />
        </MemoryRouter>
    ));
    expect(screen.queryByRole('button', { name: 'Edit', exact: true })).toBeNull();
    await waitFor(() =>
        expect(screen.getByRole('img', { name: 'Bodyweight' }).textContent).toContain('7-day average: 8 points')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Period: 3 months' }));
    const choices = await screen.findByRole('dialog', { name: 'Choose Period' });
    fireEvent.animationEnd(choices);
    fireEvent.click(within(choices).getByRole('button', { name: 'All time', exact: true }));
    expect(screen.getByRole('button', { name: 'Period: All time' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Bodyweight' }).textContent).toContain('Daily: 9 points');
    expect(screen.getByRole('img', { name: 'Bodyweight' }).textContent).toContain('7-day average: 9 points');
    fireEvent.animationEnd(choices);
    fireEvent.click(screen.getByRole('button', { name: 'Records', exact: true }));
    const records = await screen.findByRole('dialog', { name: 'Weight records' });
    fireEvent.animationEnd(records);
    expect(within(records).getAllByRole('button', { name: 'Edit', exact: true })).toHaveLength(9);
    expect(within(records).queryByRole('button', { name: 'Next page' })).toBeNull();
    fireEvent.click(within(records).getAllByRole('button', { name: 'Edit', exact: true })[0]);
    const editor = await screen.findByRole('dialog', { name: 'Edit weight' });
    fireEvent.animationEnd(editor);
    const latest = await db.bodyweightMeasurements.orderBy('measuredAt').last();
    if (!latest) {
        throw new Error('Expected a seeded weight');
    }
    fireEvent.click(within(editor).getByRole('button', { name: 'Increase Weight (kg)' }));
    await waitFor(async () =>
        expect((await db.bodyweightMeasurements.get(latest.id))?.value).toBeCloseTo(latest.value + 0.1)
    );
    fireEvent.click(within(editor).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(editor);
    await waitFor(() =>
        expect(
            within(records).getByText(`${(latest.value + 0.1).toFixed(1)} kg · ${formatDate(latest.measuredAt)}`)
        ).toBeTruthy()
    );
    fireEvent.click(within(records).getAllByRole('button', { name: 'Delete', exact: true })[0]);
    const confirm = await screen.findByRole('dialog', { name: /^Delete / });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Yes', exact: true }));
    await waitFor(async () => expect(await db.bodyweightMeasurements.get(latest.id)).toBeUndefined());
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(records).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(records);
    expect(screen.queryByRole('button', { name: 'Edit', exact: true })).toBeNull();
    const next = await db.bodyweightMeasurements.orderBy('measuredAt').last();
    if (!next) {
        throw new Error('Expected remaining weight history');
    }
    await waitFor(() =>
        expect(screen.getByText(`${next.value.toFixed(1)} kg · ${formatDate(next.measuredAt)}`)).toBeTruthy()
    );
});

it('opens each exercise graph directly without a dropdown or result list', async () => {
    render(() => (
        <MemoryRouter root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/" component={ExerciseListPage} />
        </MemoryRouter>
    ));
    await screen.findByRole('button', { name: 'Edit Air squat' });
    expect(screen.queryByRole('button', { name: 'Exercise: Air squat' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Progress Bent-over row' }));
    const graph = await screen.findByRole('dialog', { name: 'Bent-over row graph' });
    fireEvent.animationEnd(graph);
    expect(await within(graph).findByRole('img', { name: 'Bent-over row' })).toBeTruthy();
    expect(within(graph).queryByText(/Epley estimate/)).toBeNull();
    expect(within(graph).queryByText(/reps/)).toBeNull();
    fireEvent.click(within(graph).getByRole('button', { name: 'About this graph' }));
    const help = await screen.findByRole('dialog', { name: 'About this graph' });
    fireEvent.animationEnd(help);
    expect(within(help).getByText(/Epley estimate/)).toBeTruthy();
    fireEvent.click(within(help).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(help);
    expect(screen.getByRole('dialog', { name: 'Bent-over row graph' })).toBeTruthy();
    fireEvent.keyDown(graph, { key: 'Escape' });
    fireEvent.animationEnd(graph);
    expect(await screen.findByRole('button', { name: 'Edit Air squat' })).toBeTruthy();
});
