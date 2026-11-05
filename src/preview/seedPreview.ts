import type { FitnesDB } from '../db/database.ts';
import { importDatabase } from '../db/repository.ts';
import type { DataExport } from '../domain/dataExport.ts';
import { defaultPrescription } from '../domain/defaultPrescription.ts';
import { airSquat, bentOverRow, dumbbellCurl, exampleExercises, plank, pullUp } from '../domain/examples.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import {
    bodyweightMeasurementId,
    plannedSetId,
    sequenceEntryId,
    workoutSessionId,
    workoutTemplateId,
} from '../domain/ids.ts';
import { draftResultFromPrescription } from '../domain/recordSession.ts';
import { createSessionFromTemplate } from '../domain/session.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';

const seedKey = 'fitnes-preview-seeded-v1';
const day = 86_400_000;

/** Seed only an explicitly enabled, unused preview; never replace existing device data. */
async function seedPreview(db: FitnesDB): Promise<void> {
    if (localStorage.getItem(seedKey)) {
        return;
    }

    await db.transaction('rw', db.exercises, db.templates, db.sessions, db.bodyweightMeasurements, async () => {
        const counts = await Promise.all(db.tables.map((table) => table.count()));
        if (counts.some((count) => count > 0)) {
            return;
        }
        await importDatabase(db, previewData(Date.now()));
    });
    localStorage.setItem(seedKey, 'true');
}

/** Representative data covers external loads, bodyweight, per-side reps and timed sets. */
function previewData(now: number): DataExport {
    const templates = [
        previewTemplate('strength', 'Strength A', 'Rows, pull-ups and core', [bentOverRow, pullUp, plank]),
        previewTemplate('full-body', 'Full body', 'A quick all-round session', [
            airSquat,
            bentOverRow,
            dumbbellCurl,
            plank,
        ]),
        previewTemplate('pull', 'Pull day', 'Back and arms', [pullUp, bentOverRow, dumbbellCurl]),
    ];
    const bodyweightMeasurements = Array.from({ length: 8 }, (_, index) => ({
        id: bodyweightMeasurementId.assert(`preview-weight-${index}`),
        measuredAt: now - (22 - index * 3) * day,
        value: Math.round((80.8 - index * 0.1) * 10) / 10,
        unit: 'kg' as const,
    }));
    const sessions = [14, 10, 7, 3].map((daysAgo, index) => {
        const template = templates[index % templates.length];
        const session = createSessionFromTemplate({
            id: workoutSessionId.assert(`preview-session-${index}`),
            template,
            startedAt: now - daysAgo * day,
            bodyweight: bodyweightMeasurements[0],
        });
        session.results = template.sequence.map((entry, setIndex) =>
            draftResultFromPrescription(
                entry.id,
                template.sets[setIndex].prescription,
                session.startedAt + (setIndex + 1) * 120_000
            )
        );
        session.completedAt = session.startedAt + 35 * 60_000;
        return session;
    });

    return {
        schemaVersion: 1,
        exercises: structuredClone(exampleExercises),
        templates,
        sessions,
        bodyweightMeasurements,
    };
}

function previewTemplate(
    slug: string,
    name: string,
    description: string,
    exercises: ExerciseDefinition[]
): WorkoutTemplate {
    const sets = exercises.flatMap((exercise, exerciseIndex) =>
        Array.from({ length: 3 }, (_, index) => {
            const prescription = defaultPrescription(exercise);
            if (prescription.load.kind === 'external') {
                prescription.load.weight.value = exercise.id === bentOverRow.id ? 40 : 10;
            }
            return {
                id: plannedSetId.assert(`preview-${slug}-${exerciseIndex}-${index}`),
                exerciseId: exercise.id,
                prescription,
            };
        })
    );
    return {
        id: workoutTemplateId.assert(`preview-${slug}`),
        name,
        description,
        schemaVersion: 1,
        exercises: structuredClone(exercises),
        sets,
        sequence: sets.map((set, index) => ({
            id: sequenceEntryId.assert(`preview-${slug}-entry-${index}`),
            plannedSetId: set.id,
        })),
    };
}

export { previewData, seedPreview };
