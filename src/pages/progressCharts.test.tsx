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
    expect(await screen.findByRole('img', { name: 'Estimated max' })).toBeTruthy();
    expect(screen.getByText(/Epley estimate/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Library', exact: true }));
    expect(await screen.findByRole('button', { name: 'Edit Air squat' })).toBeTruthy();
});
