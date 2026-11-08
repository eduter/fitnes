import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { pullUp } from '../domain/examples.ts';
import { draftResultFromPrescription } from '../domain/recordSession.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
import { rowTemplate } from '../test/domainFixtures.ts';
import { FitnesDB } from './database.ts';

const TEST_DB_NAME = 'fitnes';

describe('FitnesDB', () => {
    afterEach(async () => {
        await Dexie.delete(TEST_DB_NAME);
    });

    it('converts saved overrides to set properties and removes timing from existing completed history', async () => {
        await Dexie.delete(TEST_DB_NAME);
        const old = new Dexie(TEST_DB_NAME);
        old.version(2).stores({
            workouts: 'id, performedAt',
            exercises: 'id, name',
            templates: 'id, name',
            sessions: 'id, startedAt, completedAt, templateId',
            bodyweightMeasurements: 'id, measuredAt',
        });
        await old.open();
        const plan = rowTemplate();
        plan.exercises[0].timing = { prepSeconds: 8, secondsPerRep: 2 };
        plan.timingOverrides = { [plan.exercises[0].id]: { prepSeconds: 9 } };
        const session = createSessionFromTemplate({ id: 'old-history' as never, template: plan, startedAt: 1 });
        session.completedAt = 3;
        session.results = [draftResultFromPrescription(plan.sequence[0].id, plan.sets[0].prescription, 2)];
        await old.table('templates').put(plan);
        await old.table('sessions').put(session);
        old.close();
        const upgraded = new FitnesDB();
        await upgraded.open();
        const saved = await upgraded.templates.get(plan.id);
        expect(saved?.timingOverrides).toBeUndefined();
        expect(saved?.sets[0].timing).toEqual({ prepSeconds: 9 });
        expect(saved?.sets[1].timing).toEqual({ prepSeconds: 9 });
        const history = await upgraded.sessions.get(session.id);
        expect(history?.snapshot.timingOverrides).toBeUndefined();
        expect(history?.snapshot.sets[0].timing).toBeUndefined();
        expect(history?.snapshot.exercises[0].timing).toBeUndefined();
        expect(history?.results).toEqual(session.results);
        upgraded.close();
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
