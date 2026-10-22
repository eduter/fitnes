import { latestBodyweightAtOrBefore, type BodyweightMeasurement } from '../domain/bodyweight.ts';
import { EXPORT_SCHEMA_VERSION, type DataExport } from '../domain/dataExport.ts';
import type { ExerciseDefinition } from '../domain/exercise.ts';
import { exampleExercises } from '../domain/examples.ts';
import type { WorkoutSession } from '../domain/session.ts';
import { validateBodyweightMeasurement } from '../domain/validateBodyweightMeasurement.ts';
import { validateExercise } from '../domain/validateExercise.ts';
import { validateWorkoutSession } from '../domain/validateWorkoutSession.ts';
import { validateWorkoutTemplate } from '../domain/validateWorkoutTemplate.ts';
import type { ValidationResult } from '../domain/validation.ts';
import type { WorkoutTemplate } from '../domain/workoutTemplate.ts';
import type { FitnesDB } from './database.ts';

/** Persist a valid catalog exercise, leaving the store unchanged when validation fails. */
async function putExercise(db: FitnesDB, input: unknown): Promise<ValidationResult<ExerciseDefinition>> {
    const parsed = validateExercise(input);
    if (!parsed.ok) {
        return parsed;
    }

    await db.exercises.put(parsed.value);
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
async function deleteExercise(db: FitnesDB, id: string): Promise<void> {
    await db.exercises.delete(id);
}

/** Insert the representative catalog when the exercise store is empty. */
async function seedExampleExercises(db: FitnesDB): Promise<void> {
    if ((await db.exercises.count()) > 0) {
        return;
    }

    await db.exercises.bulkPut(exampleExercises);
}

/** Persist a valid workout template. */
async function putTemplate(db: FitnesDB, input: unknown): Promise<ValidationResult<WorkoutTemplate>> {
    const parsed = validateWorkoutTemplate(input);
    if (!parsed.ok) {
        return parsed;
    }

    await db.templates.put(parsed.value);
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
async function deleteTemplate(db: FitnesDB, id: string): Promise<void> {
    await db.templates.delete(id);
}

/** Persist a valid workout session. */
async function putSession(db: FitnesDB, input: unknown): Promise<ValidationResult<WorkoutSession>> {
    const parsed = validateWorkoutSession(input);
    if (!parsed.ok) {
        return parsed;
    }

    await db.sessions.put(parsed.value);
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
async function deleteSession(db: FitnesDB, id: string): Promise<void> {
    await db.sessions.delete(id);
}

/** Persist a valid bodyweight reading. */
async function putBodyweightMeasurement(
    db: FitnesDB,
    input: unknown
): Promise<ValidationResult<BodyweightMeasurement>> {
    const parsed = validateBodyweightMeasurement(input);
    if (!parsed.ok) {
        return parsed;
    }

    await db.bodyweightMeasurements.put(parsed.value);
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
async function deleteBodyweightMeasurement(db: FitnesDB, id: string): Promise<void> {
    await db.bodyweightMeasurements.delete(id);
}

/**
 * Read every stored row into one document. Rows are read from the tables
 * directly rather than through the validating readers, so a row this build
 * cannot parse is still exported instead of blocking the export. An export
 * should never be the thing that loses data.
 */
async function exportDatabase(db: FitnesDB): Promise<DataExport> {
    const [exercises, templates, sessions, bodyweightMeasurements] = await Promise.all([
        db.exercises.toArray(),
        db.templates.toArray(),
        db.sessions.toArray(),
        db.bodyweightMeasurements.toArray(),
    ]);

    return {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: Date.now(),
        exercises,
        templates,
        sessions,
        bodyweightMeasurements,
    };
}

/**
 * Replace every stored collection with the contents of `value`, in a single
 * transaction so a failure part-way leaves the previous data intact. This is a
 * whole-database replace, not a merge: a record absent from `value` is deleted.
 */
async function importDatabase(db: FitnesDB, value: DataExport): Promise<void> {
    await db.transaction('rw', db.exercises, db.templates, db.sessions, db.bodyweightMeasurements, async () => {
        await Promise.all([
            db.exercises.clear(),
            db.templates.clear(),
            db.sessions.clear(),
            db.bodyweightMeasurements.clear(),
        ]);
        await Promise.all([
            db.exercises.bulkPut(value.exercises),
            db.templates.bulkPut(value.templates),
            db.sessions.bulkPut(value.sessions),
            db.bodyweightMeasurements.bulkPut(value.bodyweightMeasurements),
        ]);
    });
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
