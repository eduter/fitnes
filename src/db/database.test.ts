import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { pullUp } from '../domain/examples.ts';
import { FitnesDB } from './database.ts';

const TEST_DB_NAME = 'fitnes';

describe('FitnesDB', () => {
    afterEach(async () => {
        await Dexie.delete(TEST_DB_NAME);
    });

    it('opens domain stores while preserving legacy workout rows', async () => {
        await Dexie.delete(TEST_DB_NAME);

        const legacy = new Dexie(TEST_DB_NAME);
        legacy.version(1).stores({ workouts: 'id, performedAt' });
        await legacy.open();
        await legacy.table('workouts').put({ id: 'legacy-1', name: 'Original workout', performedAt: 1 });
        legacy.close();

        const testDb = new FitnesDB();
        await testDb.open();

        await testDb.exercises.add(pullUp);

        expect(testDb.tables.map((table) => table.name).sort()).toEqual([
            'bodyweightMeasurements',
            'exercises',
            'sessions',
            'templates',
            'workouts',
        ]);
        expect(await testDb.exercises.get(pullUp.id)).toMatchObject({ name: 'Pull-up' });

        expect(await testDb.table('workouts').get('legacy-1')).toMatchObject({ name: 'Original workout' });
        testDb.close();
    });
});
