import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { exampleExercises, pullUp } from '../domain/examples.ts';
import { createWorkoutTemplate } from '../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../domain/defaultPrescription.ts';
import { generatePlannedSetId, generateSequenceEntryId, generateWorkoutTemplateId } from '../domain/generateIds.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
import { FitnesDB } from './database.ts';
import {
    deleteBodyweightMeasurement,
    deleteExercise,
    deleteSession,
    deleteTemplate,
    getExercise,
    listBodyweightMeasurements,
    listExercises,
    listSessions,
    listTemplates,
    putBodyweightMeasurement,
    putExercise,
    putSession,
    putTemplate,
    seedExampleExercises,
} from './repository.ts';

const TEST_DB_NAME = 'fitnes';

async function openDb(): Promise<FitnesDB> {
    await Dexie.delete(TEST_DB_NAME);
    const testDb = new FitnesDB();
    await testDb.open();
    return testDb;
}

describe('FitnesDB repository', () => {
    let testDb: FitnesDB | undefined;

    afterEach(async () => {
        testDb?.close();
        await Dexie.delete(TEST_DB_NAME);
    });

    it('persists a valid exercise and rejects an invalid one', async () => {
        testDb = await openDb();

        const saved = await putExercise(testDb, pullUp);
        expect(saved.ok).toBe(true);
        expect(await listExercises(testDb)).toEqual([pullUp]);
        expect(await getExercise(testDb, pullUp.id)).toEqual(pullUp);

        const rejected = await putExercise(testDb, { ...pullUp, loads: [] });
        expect(rejected.ok).toBe(false);
        expect(await listExercises(testDb)).toEqual([pullUp]);
    });

    it('seeds example exercises only when the catalog is empty', async () => {
        testDb = await openDb();

        await seedExampleExercises(testDb);
        expect(await listExercises(testDb)).toHaveLength(exampleExercises.length);

        await deleteExercise(testDb, pullUp.id);
        await seedExampleExercises(testDb);
        expect(await listExercises(testDb)).toHaveLength(exampleExercises.length - 1);
    });

    it('persists a catalog-built template, a session, and bodyweight history', async () => {
        testDb = await openDb();
        await seedExampleExercises(testDb);

        const plannedSetId = generatePlannedSetId();
        const templateResult = createWorkoutTemplate({
            id: generateWorkoutTemplateId(),
            name: 'Pull day',
            catalog: exampleExercises,
            sets: [
                {
                    id: plannedSetId,
                    exerciseId: pullUp.id,
                    prescription: defaultPrescription(pullUp),
                },
            ],
            sequence: [{ id: generateSequenceEntryId(), plannedSetId }],
        });
        expect(templateResult.ok).toBe(true);
        if (!templateResult.ok) {
            return;
        }

        const savedTemplate = await putTemplate(testDb, templateResult.value);
        expect(savedTemplate.ok).toBe(true);
        expect(await listTemplates(testDb)).toEqual([templateResult.value]);

        const bodyweight = await putBodyweightMeasurement(testDb, {
            id: 'bw-1',
            measuredAt: 1_000,
            value: 80,
            unit: 'kg',
        });
        expect(bodyweight.ok).toBe(true);
        if (!bodyweight.ok) {
            return;
        }

        const session = createSessionFromTemplate({
            id: 'sess-1',
            template: templateResult.value,
            startedAt: 2_000,
            bodyweight: bodyweight.value,
        });
        const savedSession = await putSession(testDb, session);
        expect(savedSession.ok).toBe(true);
        expect(await listSessions(testDb)).toEqual([session]);
        expect(await listBodyweightMeasurements(testDb)).toEqual([bodyweight.value]);

        await deleteTemplate(testDb, templateResult.value.id);
        await deleteSession(testDb, session.id);
        await deleteBodyweightMeasurement(testDb, bodyweight.value.id);
        expect(await listTemplates(testDb)).toEqual([]);
        expect(await listSessions(testDb)).toEqual([]);
        expect(await listBodyweightMeasurements(testDb)).toEqual([]);
    });
});
