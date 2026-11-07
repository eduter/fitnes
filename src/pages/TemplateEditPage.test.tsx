/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { TemplateEditPage } from './TemplateEditPage.tsx';

beforeEach(async () => {
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

function renderWorkout() {
    const history = createMemoryHistory();
    history.set({ value: '/templates/preview-strength', replace: true });
    return render(() => (
        <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/templates/:id" component={TemplateEditPage} />
        </MemoryRouter>
    ));
}

async function openAdd() {
    await screen.findByRole('heading', { name: 'Strength A' });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Add set' });
    fireEvent.animationEnd(dialog);
    return dialog;
}

it('keeps Add as a bounded draft over the workout and cancels without adding a set', async () => {
    renderWorkout();
    const before = await db.templates.get('preview-strength');
    const dialog = await openAdd();
    expect(screen.getByRole('heading', { name: 'Strength A' })).toBeTruthy();
    expect(within(dialog).queryByRole('navigation')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel', exact: true }));
    fireEvent.animationEnd(dialog);
    expect(await db.templates.get('preview-strength')).toEqual(before);
});

it('adds the chosen exercise and prescription only on Add', async () => {
    renderWorkout();
    const before = await db.templates.get('preview-strength');
    const dialog = await openAdd();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Exercise:/ }));
    const chooser = await screen.findByRole('dialog', { name: 'Choose Exercise' });
    fireEvent.animationEnd(chooser);
    fireEvent.click(within(chooser).getByRole('button', { name: 'Air squat', exact: true }));
    fireEvent.animationEnd(chooser);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add', exact: true }));
    await waitFor(async () => {
        const saved = await db.templates.get('preview-strength');
        expect(saved?.sequence).toHaveLength((before?.sequence.length ?? 0) + 1);
        expect(saved?.sets.at(-1)?.exerciseId).toBe('ex-air-squat');
        expect(saved?.sets.at(-1)?.prescription.measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'total',
            reps: 8,
        });
    });
});
