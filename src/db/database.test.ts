import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { FitnesDB } from './database.ts';

const TEST_DB_NAME = 'fitnes';

describe('FitnesDB', () => {
    afterEach(async () => {
        await Dexie.delete(TEST_DB_NAME);
    });

    it('opens and persists workouts', async () => {
        await Dexie.delete(TEST_DB_NAME);

        const testDb = new FitnesDB();
        await testDb.open();

        const now = Date.now();
        await testDb.workouts.add({
            id: 'workout-1',
            name: 'Push day',
            performedAt: now,
            notes: '',
            createdAt: now,
            updatedAt: now,
        });

        expect(await testDb.workouts.count()).toBe(1);
        expect(await testDb.workouts.get('workout-1')).toMatchObject({ name: 'Push day' });

        testDb.close();
    });
});
