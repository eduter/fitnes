import { type BodyweightMeasurement, latestBodyweightAtOrBefore } from '../domain/bodyweight.ts';
import type { DataExport } from '../domain/dataExport.ts';
import { exampleExercises } from '../domain/examples.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import type { WorkoutSession } from '../domain/session.ts';
import { validateBodyweightMeasurement } from '../domain/validateBodyweightMeasurement.ts';
import { validateExercise } from '../domain/validateExercise.ts';
import { validateWorkoutSession } from '../domain/validateWorkoutSession.ts';
import { validateWorkoutTemplate } from '../domain/validateWorkoutTemplate.ts';
import type { ValidationResult } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';
import { notifyDataChange } from './changes.ts';
import type { FitnesDB } from './database.ts';
import {
    domainTables,
    mutateRecord,
    rawData,
    readLocalMetadata,
    replaceLocalData,
    type WriteGuard,
} from './syncAdapter.ts';

/** Persist a valid catalog exercise, leaving the store unchanged when validation fails. */
async function putExercise(
    db: FitnesDB,
    input: unknown,
    guard?: WriteGuard
): Promise<ValidationResult<ExerciseDefinition>> {
    const parsed = validateExercise(input);
    if (!parsed.ok) {
        return parsed;
    }

    await mutateRecord(db, 'exercises', parsed.value.id, () => db.exercises.put(parsed.value), guard);
    return parsed;
}

/** Load every catalog exercise, sorted by name. */
async function listExercises(db: FitnesDB): Promise<ExerciseDefinition[]> {
    const rows = await db.exercises.orderBy('name').toArray();
    return rows.map((row) => readExercise(row));
}

/** Load one catalog exercise by id. */
async function getExercise(db: FitnesDB, id: string): Promise<ExerciseDefinition | undefined> {
    const row = await db.exercises.get(id);
    return row ? readExercise(row) : undefined;
}

/** Remove a catalog exercise. Templates and sessions keep their snapshots. */
async function deleteExercise(db: FitnesDB, id: string, guard?: WriteGuard): Promise<void> {
    await mutateRecord(db, 'exercises', id, () => db.exercises.delete(id), guard);
}

/** Insert the representative catalog when the exercise store is empty. */
async function seedExampleExercises(db: FitnesDB): Promise<void> {
    await db.transaction('rw', [...domainTables(db), db.syncLocal], async (transaction) => {
        const meta = await readLocalMetadata(db);
        if (meta.initialized) {
            return;
        }
        const pristine = (await db.exercises.count()) === 0;
        if (pristine) {
            await db.exercises.bulkPut(exampleExercises);
        }
        await db.syncLocal.put({ ...meta, initialized: true, generation: meta.generation + (pristine ? 1 : 0) });
        transaction.on('complete', notifyDataChange);
    });
}

/** Persist a valid workout template. */
async function putTemplate(
    db: FitnesDB,
    input: unknown,
    guard?: WriteGuard
): Promise<ValidationResult<WorkoutTemplate>> {
    const parsed = validateWorkoutTemplate(input);
    if (!parsed.ok) {
        return parsed;
    }

    await mutateRecord(db, 'templates', parsed.value.id, () => db.templates.put(parsed.value), guard);
    return parsed;
}

/** Load every workout template, sorted by name. */
async function listTemplates(db: FitnesDB): Promise<WorkoutTemplate[]> {
    const rows = await db.templates.orderBy('name').toArray();
    return rows.map((row) => readTemplate(row));
}

/** Load one workout template by id. */
async function getTemplate(db: FitnesDB, id: string): Promise<WorkoutTemplate | undefined> {
    const row = await db.templates.get(id);
    return row ? readTemplate(row) : undefined;
}

/** Remove a workout template. Sessions keep their snapshots. */
async function deleteTemplate(db: FitnesDB, id: string, guard?: WriteGuard): Promise<void> {
    await mutateRecord(db, 'templates', id, () => db.templates.delete(id), guard);
}

/** Persist a valid workout session. */
async function putSession(db: FitnesDB, input: unknown, guard?: WriteGuard): Promise<ValidationResult<WorkoutSession>> {
    const parsed = validateWorkoutSession(input);
    if (!parsed.ok) {
        return parsed;
    }

    await mutateRecord(db, 'sessions', parsed.value.id, () => db.sessions.put(parsed.value), guard);
    return parsed;
}

/** Load every session, most recently started first. */
async function listSessions(db: FitnesDB): Promise<WorkoutSession[]> {
    const rows = await db.sessions.orderBy('startedAt').reverse().toArray();
    return rows.map((row) => readSession(row));
}

/** Load one session by id. */
async function getSession(db: FitnesDB, id: string): Promise<WorkoutSession | undefined> {
    const row = await db.sessions.get(id);
    return row ? readSession(row) : undefined;
}

/** Remove a recorded or in-progress session. */
async function deleteSession(db: FitnesDB, id: string, guard?: WriteGuard): Promise<void> {
    await mutateRecord(db, 'sessions', id, () => db.sessions.delete(id), guard);
}

/** Persist a valid bodyweight reading. */
async function putBodyweightMeasurement(
    db: FitnesDB,
    input: unknown,
    guard?: WriteGuard
): Promise<ValidationResult<BodyweightMeasurement>> {
    const parsed = validateBodyweightMeasurement(input);
    if (!parsed.ok) {
        return parsed;
    }

    await mutateRecord(
        db,
        'bodyweightMeasurements',
        parsed.value.id,
        () => db.bodyweightMeasurements.put(parsed.value),
        guard
    );
    return parsed;
}

/** Load bodyweight history, newest measurement first. */
async function listBodyweightMeasurements(db: FitnesDB): Promise<BodyweightMeasurement[]> {
    const rows = await db.bodyweightMeasurements.orderBy('measuredAt').reverse().toArray();
    return rows.map((row) => readBodyweight(row));
}

/** The latest reading at or before `at`, using stored chronological order. */
async function latestStoredBodyweight(db: FitnesDB, at: number): Promise<BodyweightMeasurement | undefined> {
    const measurements = await db.bodyweightMeasurements.orderBy('measuredAt').toArray();
    return latestBodyweightAtOrBefore(
        measurements.map((row) => readBodyweight(row)),
        at
    );
}

/** Remove one bodyweight reading. Sessions keep their snapshots. */
async function deleteBodyweightMeasurement(db: FitnesDB, id: string, guard?: WriteGuard): Promise<void> {
    await mutateRecord(db, 'bodyweightMeasurements', id, () => db.bodyweightMeasurements.delete(id), guard);
}

/**
 * Read every stored row into one document. Rows are read from the tables
 * directly rather than through the validating readers, so a row this build
 * cannot parse is still exported instead of blocking the export. An export
 * should never be the thing that loses data.
 */
async function exportDatabase(db: FitnesDB): Promise<DataExport> {
    return db.transaction('r', domainTables(db), async () => ({ ...(await rawData(db)), exportedAt: Date.now() }));
}

/**
 * Replace every stored collection with the contents of `value`, in a single
 * transaction so a failure part-way leaves the previous data intact. This is a
 * whole-database replace, not a merge: a record absent from `value` is deleted.
 */
async function importDatabase(db: FitnesDB, value: DataExport): Promise<void> {
    await replaceLocalData(db, value);
}

function readExercise(row: ExerciseDefinition): ExerciseDefinition {
    return unwrap(validateExercise(row), 'exercise', row.id);
}

function readTemplate(row: WorkoutTemplate): WorkoutTemplate {
    return unwrap(validateWorkoutTemplate(row), 'template', row.id);
}

function readSession(row: WorkoutSession): WorkoutSession {
    return unwrap(validateWorkoutSession(row), 'session', row.id);
}

function readBodyweight(row: BodyweightMeasurement): BodyweightMeasurement {
    return unwrap(validateBodyweightMeasurement(row), 'bodyweight measurement', row.id);
}

function unwrap<T>(parsed: ValidationResult<T>, kind: string, id: string): T {
    if (!parsed.ok) {
        const details = parsed.errors.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
        throw new Error(`corrupt ${kind} '${id}': ${details}`);
    }

    return parsed.value;
}

export {
    deleteBodyweightMeasurement,
    deleteExercise,
    deleteSession,
    deleteTemplate,
    exportDatabase,
    getExercise,
    getSession,
    getTemplate,
    importDatabase,
    latestStoredBodyweight,
    listBodyweightMeasurements,
    listExercises,
    listSessions,
    listTemplates,
    putBodyweightMeasurement,
    putExercise,
    putSession,
    putTemplate,
    seedExampleExercises,
};
