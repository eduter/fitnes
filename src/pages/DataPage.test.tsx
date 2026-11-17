/** @vitest-environment jsdom */
import { setSfxVolume } from '../audio/sfx.ts';
import { MemoryRouter, Route } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { exportDatabase, importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { DataPage } from './DataPage.tsx';

beforeEach(async () => {
    await importDatabase(db, previewData(Date.now()));
});
afterEach(cleanup);

function renderSettings(): void {
    render(() => (
        <MemoryRouter root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/" component={DataPage} />
        </MemoryRouter>
    ));
}

function chooseFile(text: () => Promise<string>): void {
    const file = new File([], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: text });
    fireEvent.change(screen.getByLabelText('Choose file'), { target: { files: [file] } });
}

it('loads a large JSON file and replaces data only after confirmation', async () => {
    const before = { ...(await exportDatabase(db)), exportedAt: expect.any(Number) };
    const imported = previewData(Date.now());
    imported.exercises[0].name = 'Imported exercise';
    imported.exercises[0].description = 'Large backup '.repeat(20_000);
    renderSettings();
    chooseFile(async () => JSON.stringify(imported));
    await screen.findByText(/Loaded backup.json/);
    expect(await exportDatabase(db)).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Replace all local data' }));
    const confirm = screen.getByRole('dialog');
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(confirm);
    expect(await exportDatabase(db)).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Replace all local data' }));
    const retry = screen.getByRole('dialog');
    fireEvent.animationEnd(retry);
    fireEvent.click(within(retry).getByRole('button', { name: 'Yes', exact: true }));
    await screen.findByText(/Replaced local data/);
    expect((await exportDatabase(db)).exercises).toEqual(expect.arrayContaining(imported.exercises));
    expect(await db.exercises.count()).toBe(imported.exercises.length);
});

it('rejects malformed JSON and invalid records without replacing existing data', async () => {
    const before = { ...(await exportDatabase(db)), exportedAt: expect.any(Number) };
    renderSettings();
    chooseFile(async () => '{');
    await screen.findByText(/not valid JSON/);
    expect(await exportDatabase(db)).toEqual(before);
    const invalid = previewData(Date.now());
    invalid.exercises[0].name = '';
    chooseFile(async () => JSON.stringify(invalid));
    await screen.findByText(/exercises\[0\].name/);
    expect(await exportDatabase(db)).toEqual(before);
});

it('reports unreadable files and prevents replacing data while a file is loading', async () => {
    renderSettings();
    let rejectRead: (reason: Error) => void = () => {};
    chooseFile(
        () =>
            new Promise((_resolve, reject) => {
                rejectRead = reject;
            })
    );
    expect(screen.getByRole('button', { name: 'Choose file' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Replace all local data' })).toHaveProperty('disabled', true);
    rejectRead(new Error('read failed'));
    await screen.findByText(/Could not read backup.json/);
    expect(screen.getByRole('button', { name: 'Choose file' })).toHaveProperty('disabled', false);
});

it('recovers from invalid stored records by importing a valid file', async () => {
    await db.exercises.put({ id: 'broken', name: 'Old schema' } as never);
    renderSettings();
    chooseFile(async () => JSON.stringify(previewData(Date.now())));
    await screen.findByText(/Loaded backup.json/);
    fireEvent.click(screen.getByRole('button', { name: 'Replace all local data' }));
    const confirm = screen.getByRole('dialog');
    fireEvent.animationEnd(confirm);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Yes', exact: true }));
    await screen.findByText(/Replaced local data/);
    await waitFor(async () => expect(await db.exercises.get('broken')).toBeUndefined());
});

it('steps Workout SFX volume by ten, persists it, and bounds the spinner at 0 and 100', () => {
    setSfxVolume(100);
    renderSettings();
    expect(screen.getByRole('button', { name: 'Increase Workout SFX volume (%)' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Workout SFX volume (%)' }));
    expect(localStorage.getItem('fitnes-sfx-volume')).toBe('90');
    fireEvent.click(screen.getByRole('button', { name: 'Increase Workout SFX volume (%)' }));
    expect(localStorage.getItem('fitnes-sfx-volume')).toBe('100');
    for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByRole('button', { name: 'Decrease Workout SFX volume (%)' }));
    }
    expect(localStorage.getItem('fitnes-sfx-volume')).toBe('0');
    expect(screen.getByRole('button', { name: 'Decrease Workout SFX volume (%)' }).hasAttribute('disabled')).toBe(true);
    cleanup();
    renderSettings();
    expect(screen.getByRole('button', { name: /Workout SFX volume.*000.*Edit number/ })).toBeTruthy();
    setSfxVolume(100);
});
