import { type } from 'arktype';
import { loadProblems, measurementProblems, type PrescriptionProblem } from './capability.ts';
import type { ExerciseDefinition } from './exercise.ts';
import type { SetPrescription } from './prescription.ts';
import { workoutSession, type ActualResult, type WorkoutSession } from './session.ts';
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
    checkSessionSource(issues, parsed);
    checkSessionTiming(issues, parsed);
    checkResults(issues, parsed);

    if (issues.issues.length > 0) {
        return { ok: false, errors: issues.issues };
    }

    return { ok: true, value: parsed };
}

/** Report trace metadata that contradicts the session's preserved snapshot. */
function checkSessionSource(issues: IssueCollector, session: WorkoutSession): void {
    if (session.templateId !== undefined && session.templateId !== session.snapshot.id) {
        issues.add(
            ['templateId'],
            `source template id '${session.templateId}' does not match snapshot id '${session.snapshot.id}'`
        );
    }
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
        checkResultTiming(issues, session, result, index);

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
        if (!set) {
            continue;
        }

        const exercise = exercisesById.get(set.exerciseId);
        if (!exercise) {
            continue;
        }

        // A result has no execution mode; the snapshot's prescription already fixes it.
        const capabilityProblems = [
            ...measurementProblems(exercise, result.measurement),
            ...loadProblems(exercise, result.load),
        ];
        for (const problem of capabilityProblems) {
            issues.add(['results', index, problem.field], problem.message);
        }

        const invalidFields = new Set(capabilityProblems.map((problem) => problem.field));
        for (const problem of resultPrescriptionProblems(set.prescription, result)) {
            if (!invalidFields.has(problem.field)) {
                issues.add(['results', index, problem.field], problem.message);
            }
        }
    }
}

function checkResultTiming(issues: IssueCollector, session: WorkoutSession, result: ActualResult, index: number): void {
    if (result.completedAt < session.startedAt) {
        issues.add(
            ['results', index, 'completedAt'],
            `result completedAt (${result.completedAt}) is before session startedAt (${session.startedAt})`
        );
    }

    if (session.completedAt !== undefined && result.completedAt > session.completedAt) {
        issues.add(
            ['results', index, 'completedAt'],
            `result completedAt (${result.completedAt}) is after session completedAt (${session.completedAt})`
        );
    }
}

function resultPrescriptionProblems(prescription: SetPrescription, result: ActualResult): PrescriptionProblem[] {
    const problems: PrescriptionProblem[] = [];
    const prescribedMeasurement = prescription.measurement;

    if (
        result.measurement.measurement !== prescribedMeasurement.measurement ||
        result.measurement.countBasis !== prescribedMeasurement.countBasis
    ) {
        problems.push({
            field: 'measurement',
            message: `actual measurement '${result.measurement.measurement}/${result.measurement.countBasis}' does not match prescribed '${prescribedMeasurement.measurement}/${prescribedMeasurement.countBasis}'`,
        });
    }

    if (result.load.kind !== prescription.load.kind) {
        problems.push({
            field: 'load',
            message: `actual load kind '${result.load.kind}' does not match prescribed '${prescription.load.kind}'`,
        });
        return problems;
    }

    if (
        (result.load.kind === 'external' || result.load.kind === 'bodyweightExternal') &&
        (prescription.load.kind === 'external' || prescription.load.kind === 'bodyweightExternal') &&
        result.load.basis !== prescription.load.basis
    ) {
        problems.push({
            field: 'load',
            message: `actual load basis '${result.load.basis}' does not match prescribed '${prescription.load.basis}'`,
        });
    }

    return problems;
}

export { validateWorkoutSession };
