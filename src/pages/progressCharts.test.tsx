/** @vitest-environment jsdom */
import { MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
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
    expect(screen.queryByRole('img', { name: 'Bodyweight' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Graph', exact: true }));
    const graph = await screen.findByRole('dialog', { name: 'Bodyweight graph' });
    fireEvent.animationEnd(graph);
    expect(within(graph).queryByRole('button', { name: 'Edit', exact: true })).toBeNull();
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
    fireEvent.click(within(graph).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(graph);
    expect(screen.getAllByRole('button', { name: 'Edit', exact: true }).length).toBeGreaterThan(0);
});

it('selects exercise progress separately from workout grouping', async () => {
    render(() => (
        <MemoryRouter root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/" component={ExerciseListPage} />
        </MemoryRouter>
    ));
    await screen.findByRole('button', { name: 'Edit Air squat' });
    fireEvent.click(screen.getByRole('button', { name: 'Progress', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Exercise: Air squat' }));
    const choices = await screen.findByRole('dialog', { name: 'Choose Exercise' });
    fireEvent.animationEnd(choices);
    fireEvent.click(within(choices).getByRole('button', { name: 'Bent-over row', exact: true }));
    fireEvent.animationEnd(choices);
    expect(screen.queryByText(/Epley estimate/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Graph', exact: true }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Library', exact: true }));
    expect(await screen.findByRole('button', { name: 'Edit Air squat' })).toBeTruthy();
});
