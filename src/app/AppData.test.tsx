/** @vitest-environment jsdom */
import { cleanup, render, waitFor } from '@solidjs/testing-library';
import { afterEach, expect, it } from 'vitest';
import { db } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import { previewData } from '../preview/seedPreview.ts';
import { type AppData, AppDataProvider, useAppData } from './AppData.tsx';

afterEach(cleanup);

it('recovers the ready state after replacing corrupt local data with a valid import', async () => {
    const data = previewData(Date.now());
    await importDatabase(db, data);
    await db.exercises.update(data.exercises[0].id, { name: '' });
    let app!: AppData;
    render(() => (
        <AppDataProvider>
            {(() => {
                app = useAppData();
                return null;
            })()}
        </AppDataProvider>
    ));
    await waitFor(() => expect(app.loadState()).toBe('error'));
    expect(app.loadError()).toContain('corrupt exercise');

    expect((await app.importData(data)).ok).toBe(true);

    expect(app.loadState()).toBe('ready');
    expect(app.loadError()).toBeNull();
    expect(app.exercises()).toEqual(expect.arrayContaining(data.exercises));
});
