/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { DataPage } from './DataPage.tsx';
import { HomePage } from './HomePage.tsx';

beforeEach(async () => {
    localStorage.removeItem('fitnes-mass-unit');
    await importDatabase(db, previewData(Date.now()));
});
afterEach(() => {
    cleanup();
    localStorage.removeItem('fitnes-mass-unit');
});

it('persists the Settings unit and uses it for new readings without relabelling history', async () => {
    const original = await db.bodyweightMeasurements.toArray();
    const host = document.createElement('div');
    host.id = 'root';
    document.body.append(host);
    const history = createMemoryHistory();
    history.set({ value: '/data', replace: true });
    const view = render(
        () => (
            <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
                <Route path="/data" component={DataPage} />
                <Route path="/" component={HomePage} />
            </MemoryRouter>
        ),
        { container: host }
    );
    fireEvent.click(view.getByRole('button', { name: 'Mass unit: kg' }));
    const choices = await view.findByRole('dialog');
    fireEvent.animationEnd(choices, { animationName: 'nes-popover-reveal' });
    fireEvent.click(within(choices).getByRole('button', { name: 'lb' }));
    fireEvent.animationEnd(choices, { animationName: 'nes-popover-reveal' });
    expect(localStorage.getItem('fitnes-mass-unit')).toBe('lb');
    expect(await db.bodyweightMeasurements.toArray()).toEqual(original);

    history.set({ value: '/', replace: false });
    const record = (await view.findByRole('button', { name: 'Record weight' })) as HTMLButtonElement;
    await waitFor(() => expect(record.disabled).toBe(false));
    fireEvent.click(record);
    const reading = await view.findByRole('dialog');
    fireEvent.animationEnd(reading, { animationName: 'nes-popover-reveal' });
    expect(within(reading).getByRole('button', { name: 'Weight (lb): 176.6. Edit number' })).toBeTruthy();
    fireEvent.click(within(reading).getByRole('button', { name: 'Save' }));
    await view.findByText('Recorded 176.6 lb.');
    const latest = await db.bodyweightMeasurements.orderBy('measuredAt').last();
    expect(latest?.unit).toBe('lb');
    expect(latest?.value).toBe(176.6);
    for (const row of original) {
        expect(await db.bodyweightMeasurements.get(row.id)).toEqual(row);
    }
});
