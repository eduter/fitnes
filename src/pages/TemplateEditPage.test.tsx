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

it('moves a set directly with dedicated arrows and keeps all its actions on the row', async () => {
    renderWorkout();
    await screen.findByRole('heading', { name: 'Strength A' });
    const before = await db.templates.get('preview-strength');
    const row = within(screen.getByRole('article', { name: 'Set 1', exact: true }));
    expect(row.queryByRole('button', { name: 'More', exact: true })).toBeNull();
    expect(row.getByRole('button', { name: 'Move set 1 up' })).toHaveProperty('disabled', true);
    fireEvent.click(row.getByRole('button', { name: 'Move set 1 down' }));
    await waitFor(async () =>
        expect((await db.templates.get('preview-strength'))?.sequence[1].id).toBe(before?.sequence[0].id)
    );
    fireEvent.click(
        within(screen.getByRole('article', { name: 'Set 2', exact: true })).getByRole('button', {
            name: 'Move set 2 up',
        })
    );
    await waitFor(async () => expect((await db.templates.get('preview-strength'))?.sequence).toEqual(before?.sequence));
});

it('duplicates and deletes directly from the set row while retaining confirmation', async () => {
    renderWorkout();
    await screen.findByRole('heading', { name: 'Strength A' });
    const count = (await db.templates.get('preview-strength'))?.sequence.length ?? 0;
    fireEvent.click(
        within(screen.getByRole('article', { name: 'Set 1', exact: true })).getByRole('button', {
            name: 'Duplicate',
            exact: true,
        })
    );
    await waitFor(async () => expect((await db.templates.get('preview-strength'))?.sequence).toHaveLength(count + 1));
    fireEvent.click(
        within(screen.getByRole('article', { name: 'Set 2', exact: true })).getByRole('button', {
            name: 'Delete',
            exact: true,
        })
    );
    const confirm = await screen.findByRole('dialog', { name: 'Delete set 2?' });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect((await db.templates.get('preview-strength'))?.sequence).toHaveLength(count + 1);
    fireEvent.click(
        within(screen.getByRole('article', { name: 'Set 2', exact: true })).getByRole('button', {
            name: 'Delete',
            exact: true,
        })
    );
    const next = await screen.findByRole('dialog', { name: 'Delete set 2?' });
    fireEvent.animationEnd(next);
    fireEvent.click(within(next).getByRole('button', { name: 'Yes', exact: true }));
    await waitFor(async () => expect((await db.templates.get('preview-strength'))?.sequence).toHaveLength(count));
});
