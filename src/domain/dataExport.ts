import { type } from 'arktype';
import type { BodyweightMeasurement } from './bodyweight.ts';
import type { ExerciseDefinition } from './exercise.ts';
import type { WorkoutSession } from './session.ts';
import { validateBodyweightMeasurement } from './validateBodyweightMeasurement.ts';
import { validateExercise } from './validateExercise.ts';
import { validateWorkoutSession } from './validateWorkoutSession.ts';
import { validateWorkoutTemplate } from './validateWorkoutTemplate.ts';
import { formatPath, type ValidationIssue, type ValidationResult } from './validation.ts';
import type { WorkoutTemplate } from './workoutTemplate.ts';

/**
 * The export format this build reads and writes. Bump it when the shape of an
 * exported document changes. A document claiming a newer version is refused
 * rather than guessed at, because a partial read of a future format would
 * silently drop whatever this build does not know about.
 */
const EXPORT_SCHEMA_VERSION = 2;

/** Everything the app stores, in one JSON document. */
interface DataExport {
    schemaVersion: number;
    exportedAt?: number;
    exercises: ExerciseDefinition[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    bodyweightMeasurements: BodyweightMeasurement[];
}

/** The stored collections, named as they appear in an export. */
type CollectionName = 'exercises' | 'templates' | 'sessions' | 'bodyweightMeasurements';

const collectionNames: CollectionName[] = ['exercises', 'templates', 'sessions', 'bodyweightMeasurements'];

/**
 * Only the envelope is checked here. Each collection is left as `unknown[]` so a
 * single bad row can be reported with its own field path instead of failing the
 * whole document with one opaque error.
 */
const envelope = type({
    schemaVersion: 'number',
    'exportedAt?': 'number',
    'exercises?': 'unknown[]',
    'templates?': 'unknown[]',
    'sessions?': 'unknown[]',
    'bodyweightMeasurements?': 'unknown[]',
});

/** Validate a collection's rows, prefixing each issue with its position in the document. */
function parseCollection<T>(
    name: CollectionName,
    rows: unknown[],
    validate: (row: unknown) => ValidationResult<T>,
    issues: ValidationIssue[]
): T[] {
    const values: T[] = [];

    for (const [index, row] of rows.entries()) {
        const parsed = validate(row);
        if (!parsed.ok) {
            for (const issue of parsed.errors) {
                issues.push({
                    path: issue.path === '' ? `${name}[${index}]` : `${name}[${index}].${issue.path}`,
                    message: issue.message,
                });
            }
            continue;
        }
        values.push(parsed.value);
    }

    return values;
}

/**
 * Read an untrusted export document, accepting either the parsed object or the
 * raw JSON text. Every problem in the document is reported at once, each located
 * by its path within the export, so a malformed file can be corrected in one
 * pass rather than one error per attempt.
 */
function parseDataExport(input: unknown): ValidationResult<DataExport> {
    const source = typeof input === 'string' ? tryParseJson(input) : { ok: true as const, value: input };
    if (!source.ok) {
        return { ok: false, errors: [{ path: '', message: source.message }] };
    }

    const parsed = envelope(source.value);
    if (parsed instanceof type.errors) {
        return { ok: false, errors: parsed.map((error) => ({ path: formatPath(error.path), message: error.message })) };
    }

    if (parsed.schemaVersion > EXPORT_SCHEMA_VERSION) {
        return {
            ok: false,
            errors: [
                {
                    path: 'schemaVersion',
                    message: `export schema version ${parsed.schemaVersion} is newer than this app supports (${EXPORT_SCHEMA_VERSION})`,
                },
            ],
        };
    }

    const issues: ValidationIssue[] = [];
    const value: DataExport = {
        schemaVersion: parsed.schemaVersion,
        exportedAt: parsed.exportedAt,
        exercises: parseCollection('exercises', parsed.exercises ?? [], validateExercise, issues),
        templates: parseCollection('templates', parsed.templates ?? [], validateWorkoutTemplate, issues),
        sessions: parseCollection('sessions', parsed.sessions ?? [], validateWorkoutSession, issues),
        bodyweightMeasurements: parseCollection(
            'bodyweightMeasurements',
            parsed.bodyweightMeasurements ?? [],
            validateBodyweightMeasurement,
            issues
        ),
    };

    if (issues.length > 0) {
        return { ok: false, errors: issues };
    }

    return { ok: true, value };
}

/** Render an export as indented JSON, so two exports of the same data compare line by line. */
function serializeDataExport(value: DataExport): string {
    return JSON.stringify(value, null, 2);
}

/** Count the records an export carries, per collection. */
function countRecords(value: DataExport): Record<CollectionName, number> {
    return {
        exercises: value.exercises.length,
        templates: value.templates.length,
        sessions: value.sessions.length,
        bodyweightMeasurements: value.bodyweightMeasurements.length,
    };
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'unparseable';
        return { ok: false, message: `not valid JSON: ${detail}` };
    }
}

export type { CollectionName, DataExport };
export { collectionNames, countRecords, EXPORT_SCHEMA_VERSION, parseDataExport, serializeDataExport };
