import { type } from 'arktype';
import { loadProblems, measurementProblems } from './capability.ts';
import type { ExerciseDefinition } from './exercise.ts';
import { workoutSession, type WorkoutSession } from './session.ts';
import { formatPath, IssueCollector, type ValidationResult } from './validation.ts';
import { collectTemplateIssues } from './validateWorkoutTemplate.ts';

/**
 * Validate an untrusted value as a completed workout session. Beyond the
 * schema, this checks that the plan snapshot is internally sound, that every
 * result targets a real sequence occurrence exactly once, and that each result
 * matches the exercise's measurement and load capabilities.
 */
function validateWorkoutSession(input: unknown): ValidationResult<WorkoutSession> {
    const parsed = workoutSession(input);

    if (parsed instanceof type.errors) {
        return { ok: false, errors: parsed.map((error) => ({ path: formatPath(error.path), message: error.message })) };
    }

    const issues = new IssueCollector();
    collectTemplateIssues(parsed.snapshot, issues, ['snapshot']);
    checkSessionTiming(issues, parsed);
    checkResults(issues, parsed);

    if (issues.issues.length > 0) {
        return { ok: false, errors: issues.issues };
    }

    return { ok: true, value: parsed };
}

/** Report a completion timestamp that precedes the session start. */
function checkSessionTiming(issues: IssueCollector, session: WorkoutSession): void {
    const { completedAt, startedAt } = session;

    if (completedAt !== undefined && completedAt < startedAt) {
        issues.add(['completedAt'], `completedAt (${completedAt}) is before startedAt (${startedAt})`);
    }
}

/**
 * Report results that reference missing sequence occurrences, repeat an
 * occurrence, or use a measurement, execution mode, or load the occurrence's
 * exercise does not allow.
 */
function checkResults(issues: IssueCollector, session: WorkoutSession): void {
    const { snapshot } = session;
    const entriesById = new Map(snapshot.sequence.map((entry) => [entry.id, entry]));
    const setsById = new Map(snapshot.sets.map((set) => [set.id, set]));
    const exercisesById = new Map<string, ExerciseDefinition>(
        snapshot.exercises.map((exercise) => [exercise.id, exercise])
    );

    const seenOccurrences = new Set<string>();

    for (const [index, result] of session.results.entries()) {
        const entry = entriesById.get(result.sequenceEntryId);

        if (!entry) {
            issues.add(['results', index, 'sequenceEntryId'], `unknown sequence entry id '${result.sequenceEntryId}'`);
            continue;
        }

        if (seenOccurrences.has(result.sequenceEntryId)) {
            issues.add(
                ['results', index, 'sequenceEntryId'],
                `sequence entry '${result.sequenceEntryId}' already has a result`
            );
            continue;
        }
        seenOccurrences.add(result.sequenceEntryId);

        const set = setsById.get(entry.plannedSetId);
        const exercise = set ? exercisesById.get(set.exerciseId) : undefined;
        if (!exercise) {
            continue;
        }

        // A result has no execution mode; the snapshot's prescription already fixes it.
        const problems = [...measurementProblems(exercise, result.measurement), ...loadProblems(exercise, result.load)];
        for (const problem of problems) {
            issues.add(['results', index, problem.field], problem.message);
        }
    }
}

export { validateWorkoutSession };
