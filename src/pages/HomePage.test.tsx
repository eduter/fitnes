/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { HomePage } from './HomePage.tsx';
import { StartSessionPage } from './StartSessionPage.tsx';
import { WorkoutPickerPage } from './WorkoutPickerPage.tsx';

beforeEach(async () => {
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

function renderHome() {
    const host = document.createElement('div');
    host.id = 'root';
    document.body.append(host);
    const history = createMemoryHistory();
    const result = render(
        () => (
            <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
                <Route path="/" component={HomePage} />
                <Route path="/workouts" component={WorkoutPickerPage} />
                <Route path="/sessions/start/:templateId" component={StartSessionPage} />
                <Route path="/sessions/:id" component={() => <h1>Workout started</h1>} />
            </MemoryRouter>
        ),
        { container: host }
    );
    return result;
}

describe('home actions', () => {
    it('chooses a stored template and starts a persisted session with the latest bodyweight', async () => {
        const view = renderHome();
        const button = view.getByRole('button', { name: 'Start workout' }) as HTMLButtonElement;
        await waitFor(() => expect(button.disabled).toBe(false));
        fireEvent.click(button);
        const strength = await view.findByText('Strength A');
        fireEvent.click(within(strength.closest('article') as HTMLElement).getByRole('button', { name: 'Start' }));
        await view.findByRole('heading', { name: 'Workout started' });
        const session = (await db.sessions.toArray()).find((candidate) => candidate.completedAt === undefined);
        expect(session?.snapshot.name).toBe('Strength A');
        expect(session?.bodyweight?.value).toBe(80.1);
        expect(session?.results).toEqual([]);
    });

    it('records weight through the dialog without navigating away from home', async () => {
        const view = renderHome();
        const button = view.getByRole('button', { name: 'Record weight' }) as HTMLButtonElement;
        await waitFor(() => expect(button.disabled).toBe(false));
        fireEvent.click(button);
        const dialog = await view.findByRole('dialog');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Increase Weight (kg)' }));
        fireEvent.submit(within(dialog).getByRole('button', { name: 'Save' }).closest('form') as HTMLFormElement);
        await view.findByText('Recorded 80.2 kg.');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(view.queryByRole('dialog')).toBeNull();
        const reading = await db.bodyweightMeasurements.orderBy('measuredAt').last();
        expect(reading?.value).toBe(80.2);
        expect(reading?.unit).toBe('kg');
        expect(new Date(reading?.measuredAt ?? 0).getHours()).toBe(0);
        expect(view.container.querySelector('input[type="datetime-local"]')).toBeNull();
    });

    it('discards a changed draft on Cancel without creating a reading', async () => {
        const view = renderHome();
        const trigger = view.getByRole('button', { name: 'Record weight' }) as HTMLButtonElement;
        await waitFor(() => expect(trigger.disabled).toBe(false));
        fireEvent.click(trigger);
        const dialog = await view.findByRole('dialog');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Increase Weight (kg)' }));
        expect(within(dialog).getByRole('button', { name: 'Weight (kg): 080.2. Edit number' })).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(await db.bodyweightMeasurements.count()).toBe(8);
        expect(view.queryByRole('dialog')).toBeNull();
    });

    it('dismisses with Escape using the spinner popover closing lifecycle', async () => {
        const view = renderHome();
        const button = view.getByRole('button', { name: 'Record weight' }) as HTMLButtonElement;
        await waitFor(() => expect(button.disabled).toBe(false));
        fireEvent.click(button);
        const dialog = await view.findByRole('dialog');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(dialog.getAttribute('data-phase')).toBe('closing');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(view.queryByRole('dialog')).toBeNull();
        expect(await db.bodyweightMeasurements.count()).toBe(8);
    });
});

it('asks before discarding a changed reading on outside or Escape dismissal', async () => {
    const view = renderHome();
    const button = view.getByRole('button', { name: 'Record weight' }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);
    const editor = await view.findByRole('dialog', { name: 'Record weight' });
    fireEvent.animationEnd(editor);
    fireEvent.click(within(editor).getByRole('button', { name: 'Increase Weight (kg)' }));
    fireEvent.keyDown(editor, { key: 'Escape' });
    const confirm = await view.findByRole('dialog', { name: 'Discard unsaved reading?' });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect(within(editor).getByRole('button', { name: 'Weight (kg): 080.2. Edit number' })).toBeTruthy();
    expect(await db.bodyweightMeasurements.count()).toBe(8);
});
