import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { pullUp } from '../domain/examples.ts';
import { FitnesDB } from './database.ts';

const TEST_DB_NAME = 'fitnes';

describe('FitnesDB', () => {
    afterEach(async () => {
        await Dexie.delete(TEST_DB_NAME);
    });

    it('opens domain stores and drops the scaffold workouts table', async () => {
        await Dexie.delete(TEST_DB_NAME);

        const testDb = new FitnesDB();
        await testDb.open();

        await testDb.exercises.add(pullUp);

        expect(testDb.tables.map((table) => table.name).sort()).toEqual([
            'bodyweightMeasurements',
            'exercises',
            'sessions',
            'templates',
        ]);
        expect(await testDb.exercises.get(pullUp.id)).toMatchObject({ name: 'Pull-up' });

        testDb.close();
    });
});
