import { For, Show, createSignal, type JSX } from 'solid-js';
import { createWorkoutTemplate, refreshTemplateExercises } from '../../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../../domain/defaultPrescription.ts';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import { generatePlannedSetId, generateSequenceEntryId } from '../../domain/generateIds.ts';
import type { SetPrescription } from '../../domain/prescription.ts';
import type { ValidationIssue } from '../../domain/validation.ts';
import type { PlannedSet, WorkoutTemplate } from '../../domain/workoutTemplate.ts';
import { PrescriptionFields } from '../prescription/PrescriptionFields.tsx';
import { TextAreaField, TextField } from '../fields.tsx';
import { ValidationErrors } from '../ValidationErrors.tsx';
import { prescriptionSummary } from './prescriptionSummary.ts';

interface TemplateFormProps {
    value: WorkoutTemplate;
    catalog: ExerciseDefinition[];
    errors: ValidationIssue[];
    onChange: (value: WorkoutTemplate, errors: ValidationIssue[]) => void;
}

/** Edit a template's metadata, planned sets, and execution sequence. */
function TemplateForm(props: TemplateFormProps): JSX.Element {
    const [expanded, setExpanded] = createSignal<number | null>(null);

    function toggle(index: number): void {
        setExpanded((current) => (current === index ? null : index));
    }

    function rebuild(overrides: Partial<WorkoutTemplate>, existingSnapshots = props.value.exercises): void {
        const result = createWorkoutTemplate({
            id: overrides.id ?? props.value.id,
            name: overrides.name ?? props.value.name,
            description: overrides.description ?? props.value.description,
            catalog: props.catalog,
            sets: overrides.sets ?? props.value.sets,
            sequence: overrides.sequence ?? props.value.sequence,
            existingSnapshots,
        });

        if (result.ok) {
            props.onChange(result.value, []);
            return;
        }

        props.onChange(
            {
                ...props.value,
                ...overrides,
                description: overrides.description ?? props.value.description,
            },
            result.errors
        );
    }

    function setAt(index: number, set: PlannedSet): void {
        rebuild({
            sets: props.value.sets.map((candidate, candidateIndex) => (candidateIndex === index ? set : candidate)),
        });
    }

    function addSet(exerciseId: string): void {
        const exercise =
            props.catalog.find((candidate) => candidate.id === exerciseId) ??
            props.value.exercises.find((candidate) => candidate.id === exerciseId);
        if (!exercise) {
            return;
        }

        const plannedSetId = generatePlannedSetId();
        rebuild({
            sets: [
                ...props.value.sets,
                { id: plannedSetId, exerciseId: exercise.id, prescription: defaultPrescription(exercise) },
            ],
            sequence: [...props.value.sequence, { id: generateSequenceEntryId(), plannedSetId }],
        });
    }

    function removeOccurrence(sequenceIndex: number): void {
        const entry = props.value.sequence[sequenceIndex];
        if (!entry) {
            return;
        }

        rebuild({
            sets: props.value.sets.filter((set) => set.id !== entry.plannedSetId),
            sequence: props.value.sequence.filter((_, index) => index !== sequenceIndex),
        });
    }

    function moveOccurrence(sequenceIndex: number, delta: number): void {
        const target = sequenceIndex + delta;
        if (target < 0 || target >= props.value.sequence.length) {
            return;
        }

        const sequence = [...props.value.sequence];
        const current = sequence[sequenceIndex];
        const swap = sequence[target];
        if (!current || !swap) {
            return;
        }
        sequence[sequenceIndex] = swap;
        sequence[target] = current;
        rebuild({ sequence });
    }

    function duplicateOccurrence(sequenceIndex: number): void {
        const entry = props.value.sequence[sequenceIndex];
        const set = props.value.sets.find((candidate) => candidate.id === entry?.plannedSetId);
        if (!entry || !set) {
            return;
        }

        const plannedSetId = generatePlannedSetId();
        const nextSets = [
            ...props.value.sets,
            { ...set, id: plannedSetId, prescription: structuredClone(set.prescription) },
        ];
        const nextSequence = [...props.value.sequence];
        nextSequence.splice(sequenceIndex + 1, 0, { id: generateSequenceEntryId(), plannedSetId });
        rebuild({ sets: nextSets, sequence: nextSequence });
    }

    function refreshFromCatalog(): void {
        const result = refreshTemplateExercises(props.value, props.catalog);
        if (result.ok) {
            props.onChange(result.value, []);
            return;
        }
        props.onChange(props.value, result.errors);
    }

    return (
        <div class="stack">
            <ValidationErrors errors={props.errors} />
            <TextField label="Name" value={props.value.name} required onChange={(name) => rebuild({ name })} />
            <TextAreaField
                label="Description"
                value={props.value.description ?? ''}
                onChange={(description) => rebuild({ description })}
            />
            <div class="row-split">
                <p class="muted">
                    Embedded exercises are snapshots. Refreshing copies the current catalog definitions into this
                    template.
                </p>
                <button class="btn btn--secondary" type="button" onClick={refreshFromCatalog}>
                    Refresh from catalog
                </button>
            </div>
            <AddSetControl catalog={props.catalog} onAdd={addSet} />
            <ol class="set-list">
                <For each={props.value.sequence} fallback={<p class="muted">No sets yet.</p>}>
                    {(entry, index) => {
                        const set = props.value.sets.find((candidate) => candidate.id === entry.plannedSetId);
                        const exercise =
                            props.value.exercises.find((candidate) => candidate.id === set?.exerciseId) ??
                            props.catalog.find((candidate) => candidate.id === set?.exerciseId);

                        return (
                            <li>
                                <Show
                                    when={set && exercise}
                                    fallback={<p class="muted">Unknown planned set {entry.plannedSetId}</p>}
                                >
                                    <OccurrenceEditor
                                        index={index()}
                                        lastIndex={props.value.sequence.length - 1}
                                        exercise={exercise as ExerciseDefinition}
                                        catalogExercise={props.catalog.find(
                                            (candidate) => candidate.id === exercise?.id
                                        )}
                                        set={set as PlannedSet}
                                        expanded={expanded() === index()}
                                        onToggle={() => toggle(index())}
                                        onPrescription={(prescription) =>
                                            setAt(
                                                props.value.sets.findIndex((candidate) => candidate.id === set?.id),
                                                { ...(set as PlannedSet), prescription }
                                            )
                                        }
                                        onMove={(delta) => moveOccurrence(index(), delta)}
                                        onDuplicate={() => duplicateOccurrence(index())}
                                        onRemove={() => removeOccurrence(index())}
                                    />
                                </Show>
                            </li>
                        );
                    }}
                </For>
            </ol>
        </div>
    );
}

interface AddSetControlProps {
    catalog: ExerciseDefinition[];
    onAdd: (exerciseId: string) => void;
}

function AddSetControl(props: AddSetControlProps): JSX.Element {
    let selectEl: HTMLSelectElement | undefined;

    return (
        <Show
            when={props.catalog.length > 0}
            fallback={<p class="muted">Create an exercise in the catalog before adding sets.</p>}
        >
            <div class="inline-fields">
                <label class="form-field">
                    <span class="form-label">Add set of</span>
                    <select
                        class="form-input"
                        ref={(el) => {
                            selectEl = el;
                        }}
                    >
                        <For each={props.catalog}>
                            {(exercise) => <option value={exercise.id}>{exercise.name}</option>}
                        </For>
                    </select>
                </label>
                <button
                    class="btn btn--primary"
                    type="button"
                    onClick={() => {
                        const exerciseId = selectEl?.value ?? props.catalog[0]?.id;
                        if (exerciseId) {
                            props.onAdd(exerciseId);
                        }
                    }}
                >
                    Add set
                </button>
            </div>
        </Show>
    );
}

interface OccurrenceEditorProps {
    index: number;
    lastIndex: number;
    exercise: ExerciseDefinition;
    catalogExercise: ExerciseDefinition | undefined;
    set: PlannedSet;
    expanded: boolean;
    onToggle: () => void;
    onPrescription: (prescription: SetPrescription) => void;
    onMove: (delta: number) => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

/**
 * One planned set as a single collapsed row, expanding in place to the full
 * prescription editor. Collapsed-by-default is what keeps a whole plan
 * scannable: only the set being changed pays the height cost.
 */
function OccurrenceEditor(props: OccurrenceEditorProps): JSX.Element {
    const drifted = (): boolean =>
        props.catalogExercise !== undefined && JSON.stringify(props.catalogExercise) !== JSON.stringify(props.exercise);

    return (
        <div class="planned-set" classList={{ 'planned-set--expanded': props.expanded }}>
            <div class="planned-set__row">
                <button
                    class="planned-set__summary"
                    type="button"
                    aria-expanded={props.expanded}
                    onClick={props.onToggle}
                >
                    <span class="set-badge">{props.index + 1}</span>
                    <span class="planned-set__text">
                        <span class="planned-set__name">{props.exercise.name}</span>
                        <span class="planned-set__detail">{prescriptionSummary(props.set.prescription)}</span>
                    </span>
                    <span class="planned-set__caret" aria-hidden="true">
                        {props.expanded ? '▾' : '▸'}
                    </span>
                </button>
                <div class="button-row">
                    <button
                        class="btn btn--icon"
                        type="button"
                        aria-label={`Move set ${props.index + 1} up`}
                        disabled={props.index === 0}
                        onClick={() => props.onMove(-1)}
                    >
                        ↑
                    </button>
                    <button
                        class="btn btn--icon"
                        type="button"
                        aria-label={`Move set ${props.index + 1} down`}
                        disabled={props.index === props.lastIndex}
                        onClick={() => props.onMove(1)}
                    >
                        ↓
                    </button>
                    <button
                        class="btn btn--icon"
                        type="button"
                        aria-label={`Duplicate set ${props.index + 1}`}
                        onClick={props.onDuplicate}
                    >
                        ⧉
                    </button>
                    <button
                        class="btn btn--icon"
                        type="button"
                        aria-label={`Remove set ${props.index + 1}`}
                        onClick={props.onRemove}
                    >
                        ✕
                    </button>
                </div>
            </div>
            <Show when={drifted()}>
                <p class="warning-text">Catalog definition differs from this snapshot.</p>
            </Show>
            <Show when={props.expanded}>
                <div class="planned-set__body">
                    <PrescriptionFields
                        exercise={props.exercise}
                        value={props.set.prescription}
                        onChange={props.onPrescription}
                    />
                </div>
            </Show>
        </div>
    );
}

export { TemplateForm };
