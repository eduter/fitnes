/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { HomePage } from './HomePage.tsx';

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
        const dialog = await view.findByRole('dialog');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        const choices = within(dialog)
            .getAllByRole('button')
            .filter((choice) => choice.classList.contains('menu-choice'));
        expect(choices).toHaveLength(3);
        fireEvent.click(within(dialog).getByRole('button', { name: /Strength A/ }));
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
        fireEvent.click(within(dialog).getByRole('button', { name: 'Increase Weight' }));
        fireEvent.submit(
            within(dialog).getByRole('button', { name: 'Add reading' }).closest('form') as HTMLFormElement
        );
        await view.findByText('Recorded 80.2 kg.');
        fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
        expect(view.queryByRole('dialog')).toBeNull();
        const reading = await db.bodyweightMeasurements.orderBy('measuredAt').last();
        expect(reading?.value).toBe(80.2);
        expect(reading?.unit).toBe('kg');
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
