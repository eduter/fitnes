/** @vitest-environment jsdom */
import { MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { ExerciseListPage } from './ExerciseListPage.tsx';

beforeEach(async () => {
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

function renderLibrary() {
    return render(() => (
        <MemoryRouter root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/" component={ExerciseListPage} />
        </MemoryRouter>
    ));
}

it('opens the exercise form directly from Edit and keeps edits in the library', async () => {
    renderLibrary();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Air squat' }));
    const editor = await screen.findByRole('dialog', { name: 'Edit exercise' });
    fireEvent.animationEnd(editor);
    expect(screen.queryByRole('button', { name: 'Open', exact: true })).toBeNull();
    const name = within(editor).getByRole('textbox', { name: 'Name' });
    fireEvent.input(name, { target: { value: 'My squat' } });
    await waitFor(async () => expect((await db.exercises.get('ex-air-squat'))?.name).toBe('My squat'));
    expect(screen.getByRole('dialog', { name: 'Edit exercise' })).toBe(editor);
    fireEvent.click(within(editor).getByRole('button', { name: 'End', exact: true }));
    await waitFor(() => expect(editor.dataset.phase).toBe('closing'));
    fireEvent.animationEnd(editor);
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeTruthy();
    expect(screen.getByText('My squat')).toBeTruthy();
});

it('creates in the popover and leaves cancelled drafts out of storage', async () => {
    renderLibrary();
    await screen.findByRole('button', { name: 'Edit Air squat' });
    const count = await db.exercises.count();
    fireEvent.click(screen.getByRole('button', { name: 'Create', exact: true }));
    const editor = await screen.findByRole('dialog', { name: 'Create exercise' });
    fireEvent.animationEnd(editor);
    fireEvent.input(within(editor).getByRole('textbox', { name: 'Name' }), { target: { value: 'Cancelled exercise' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel', exact: true }));
    fireEvent.animationEnd(editor);
    expect(await db.exercises.count()).toBe(count);
    fireEvent.click(screen.getByRole('button', { name: 'Create', exact: true }));
    const next = await screen.findByRole('dialog', { name: 'Create exercise' });
    fireEvent.animationEnd(next);
    fireEvent.input(within(next).getByRole('textbox', { name: 'Name' }), { target: { value: 'My exercise' } });
    fireEvent.click(within(next).getByRole('button', { name: 'Create', exact: true }));
    await waitFor(async () =>
        expect((await db.exercises.toArray()).some((item) => item.name === 'My exercise')).toBe(true)
    );
});

it('offers direct deletion with a Yes/No confirmation', async () => {
    renderLibrary();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Air squat' }));
    const confirm = await screen.findByRole('dialog', { name: 'Delete Air squat?' });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect(await db.exercises.get('ex-air-squat')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
});

it('duplicates into an editor without changing the source exercise', async () => {
    renderLibrary();
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Air squat' }));
    const editor = await screen.findByRole('dialog', { name: 'Edit exercise' });
    fireEvent.animationEnd(editor);
    const name = within(editor).getByRole('textbox', { name: 'Name' });
    expect(name).toHaveProperty('value', 'Air squat (copy)');
    fireEvent.input(name, { target: { value: 'My squat copy' } });
    await waitFor(async () => {
        expect((await db.exercises.get('ex-air-squat'))?.name).toBe('Air squat');
        expect((await db.exercises.toArray()).some((item) => item.name === 'My squat copy')).toBe(true);
    });
});

it('keeps an unsaved new exercise when dismissal is cancelled', async () => {
    renderLibrary();
    await screen.findByRole('button', { name: 'Edit Air squat' });
    fireEvent.click(screen.getByRole('button', { name: 'Create', exact: true }));
    const editor = await screen.findByRole('dialog', { name: 'Create exercise' });
    fireEvent.animationEnd(editor);
    fireEvent.input(within(editor).getByRole('textbox', { name: 'Name' }), { target: { value: 'Keep my draft' } });
    fireEvent.keyDown(editor, { key: 'Escape' });
    const confirm = await screen.findByRole('dialog', { name: 'Discard unsaved exercise changes?' });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect(within(editor).getByRole('textbox', { name: 'Name' })).toHaveProperty('value', 'Keep my draft');
});
