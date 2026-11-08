import { type } from 'arktype';
import { prescriptionProblems } from './capability.ts';
import type { ExerciseDefinition } from './exercise.ts';
import { formatPath, IssueCollector, type ValidationResult } from './validation.ts';
import { type WorkoutTemplate, workoutTemplate } from './workoutTemplate.ts';

/**
 * Validate an untrusted value as a workout template, including the
 * cross-references ArkType schemas cannot express: unique IDs, resolvable
 * exercise and planned-set references, and prescriptions that match the
 * referenced exercise's capabilities.
 */
function validateWorkoutTemplate(input: unknown): ValidationResult<WorkoutTemplate> {
    const parsed = workoutTemplate(input);

    if (parsed instanceof type.errors) {
        return { ok: false, errors: parsed.map((error) => ({ path: formatPath(error.path), message: error.message })) };
    }

    const issues = new IssueCollector();
    collectTemplateIssues(parsed, issues);

    if (issues.issues.length > 0) {
        return { ok: false, errors: issues.issues };
    }

    return { ok: true, value: parsed };
}

/**
 * Check an already-parsed template's cross-references, appending issues to
 * `issues`. `prefix` locates the template inside a larger document (a session
 * snapshot) so issue paths stay meaningful. Session validation shares this so a
 * snapshot is held to the same structural rules as a live template.
 */
function collectTemplateIssues(template: WorkoutTemplate, issues: IssueCollector, prefix: PropertyKey[] = []): void {
    const exercisesById = new Map<string, ExerciseDefinition>(
        template.exercises.map((exercise) => [exercise.id, exercise])
    );
    const setIds = new Set<string>(template.sets.map((set) => set.id));

    for (const exerciseId of Object.keys(template.timingOverrides ?? {})) {
        if (!exercisesById.has(exerciseId)) {
            issues.add([...prefix, 'timingOverrides', exerciseId], 'unknown exercise timing override');
        }
    }
    checkUniqueIds(issues, template, prefix);
    checkExerciseReferences(issues, template, exercisesById, prefix);
    checkPrescriptionCapabilities(issues, template, exercisesById, prefix);
    checkSequenceReferences(issues, template, setIds, prefix);
}

/** Report duplicate exercise, planned-set, and sequence-entry IDs. */
function checkUniqueIds(issues: IssueCollector, template: WorkoutTemplate, prefix: PropertyKey[]): void {
    issues.addDuplicates([...prefix, 'exercises'], 'exercise', template.exercises);
    issues.addDuplicates([...prefix, 'sets'], 'planned set', template.sets);
    issues.addDuplicates([...prefix, 'sequence'], 'sequence entry', template.sequence);
}

/** Report planned sets whose `exerciseId` does not resolve to an embedded exercise. */
function checkExerciseReferences(
    issues: IssueCollector,
    template: WorkoutTemplate,
    exercisesById: Map<string, ExerciseDefinition>,
    prefix: PropertyKey[]
): void {
    for (const [index, set] of template.sets.entries()) {
        if (exercisesById.has(set.exerciseId)) {
            continue;
        }
        issues.add([...prefix, 'sets', index, 'exerciseId'], `unknown exercise id '${set.exerciseId}'`);
    }
}

/** Report prescriptions that the referenced exercise does not allow. */
function checkPrescriptionCapabilities(
    issues: IssueCollector,
    template: WorkoutTemplate,
    exercisesById: Map<string, ExerciseDefinition>,
    prefix: PropertyKey[]
): void {
    for (const [index, set] of template.sets.entries()) {
        const exercise = exercisesById.get(set.exerciseId);
        if (!exercise) {
            continue;
        }

        for (const problem of prescriptionProblems(exercise, set.prescription)) {
            issues.add([...prefix, 'sets', index, 'prescription', problem.field], problem.message);
        }
    }
}

/**
 * Report sequence entries whose planned set is missing and planned sets that
 * do not appear exactly once. Repeated work is modelled as distinct planned
 * sets so each execution occurrence remains independently addressable.
 */
function checkSequenceReferences(
    issues: IssueCollector,
    template: WorkoutTemplate,
    setIds: Set<string>,
    prefix: PropertyKey[]
): void {
    const occurrences = new Map<string, number>();

    for (const [index, entry] of template.sequence.entries()) {
        if (entry.plannedSetId === undefined) {
            continue;
        }
        if (!setIds.has(entry.plannedSetId)) {
            issues.add(
                [...prefix, 'sequence', index, 'plannedSetId'],
                `unknown planned set id '${entry.plannedSetId}'`
            );
        }

        const seen = occurrences.get(entry.plannedSetId);
        if (seen !== undefined) {
            issues.add(
                [...prefix, 'sequence', index, 'plannedSetId'],
                `planned set '${entry.plannedSetId}' already occurs at index ${seen}`
            );
            continue;
        }
        occurrences.set(entry.plannedSetId, index);
    }

    for (const [index, set] of template.sets.entries()) {
        if (!occurrences.has(set.id)) {
            issues.add([...prefix, 'sets', index, 'id'], `planned set '${set.id}' does not occur in the sequence`);
        }
    }
}

export { collectTemplateIssues, validateWorkoutTemplate };
