/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route, useNavigate } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { BodyweightPage } from './BodyweightPage.tsx';
import { HomePage } from './HomePage.tsx';

beforeEach(async () => {
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

it.each([
    { page: HomePage, action: 'Record weight' },
    { page: BodyweightPage, action: 'Record' },
])('protects a changed weight draft from route navigation on $action', async ({ page, action }) => {
    const history = createMemoryHistory();
    let leave!: () => void;
    render(() => (
        <MemoryRouter
            history={history}
            root={(props) => {
                const navigate = useNavigate();
                leave = () => navigate('/other');
                return <AppDataProvider>{props.children}</AppDataProvider>;
            }}
        >
            <Route path="/" component={page} />
            <Route path="/other" component={() => <h1>Other</h1>} />
        </MemoryRouter>
    ));
    const trigger = screen.getByRole('button', { name: action, exact: true }) as HTMLButtonElement;
    await waitFor(() => expect(trigger.disabled).toBe(false));
    fireEvent.click(trigger);
    const editor = await screen.findByRole('dialog', { name: 'Record weight' });
    fireEvent.animationEnd(editor);
    fireEvent.click(within(editor).getByRole('button', { name: 'Increase Weight (kg)' }));

    leave();

    const confirm = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect(within(editor).getByRole('button', { name: 'Weight (kg): 080.2. Edit number' })).toBeTruthy();
    leave();
    const next = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
    fireEvent.animationEnd(next);
    fireEvent.click(within(next).getByRole('button', { name: 'Yes', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Other' })).toBeTruthy();
    expect(await db.bodyweightMeasurements.count()).toBe(8);
});
