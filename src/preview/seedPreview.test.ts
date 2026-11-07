import { afterEach, describe, expect, it, vi } from 'vitest';
import { FitnesDB } from '../db/database.ts';
import { parseDataExport } from '../domain/dataExport.ts';
import { exampleExercises } from '../domain/examples.ts';
import { previewData, seedPreview } from './seedPreview.ts';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
});
const db = new FitnesDB();
afterEach(async () => {
    await db.delete();
    storage.clear();
});

describe('preview data', () => {
    it('passes the same validation used by imports and session logging', () => {
        const data = previewData(Date.now());
        expect(parseDataExport(data)).toEqual({ ok: true, value: data });
        expect(data.templates).toHaveLength(3);
        expect(data.sessions).toHaveLength(4);
    });

    it('seeds an empty preview once and does not restore readings the user deleted', async () => {
        await db.open();
        await seedPreview(db);
        expect(await db.templates.count()).toBe(3);
        await db.bodyweightMeasurements.clear();
        await seedPreview(db);
        expect(await db.bodyweightMeasurements.count()).toBe(0);
    });

    it('leaves any existing data untouched', async () => {
        await db.open();
        await db.exercises.add(exampleExercises[0]);
        await seedPreview(db);
        expect(await db.exercises.count()).toBe(1);
        expect(await db.templates.count()).toBe(0);
    });
});
