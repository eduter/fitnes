import { useAppData } from '../../app/AppData.tsx';
import { Button, ConfirmDialog, Popover } from '../Controls/index.ts';
import { PagedList } from '../PagedList.tsx';
import { Show, createSignal, type JSX } from 'solid-js';
import { createWorkoutTemplate, refreshTemplateExercises } from '../../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../../domain/defaultPrescription.ts';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import { generatePlannedSetId, generateSequenceEntryId } from '../../domain/generateIds.ts';
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
    const app = useAppData();
    const [editing, setEditing] = createSignal<string>();
    const [editorOpen, setEditorOpen] = createSignal(false);
    const [metadataOpen, setMetadataOpen] = createSignal(false);
    const [deleting, setDeleting] = createSignal<number>();
    let trigger: HTMLElement | undefined;
    const selectedSet = () => props.value.sets.find((set) => set.id === editing());
    const selected = () => {
        const set = selectedSet();
        const exercise = props.value.exercises.find((candidate) => candidate.id === set?.exerciseId);
        return set && exercise ? { set, exercise } : undefined;
    };

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
            sets: props.value.sets.filter(
                (set) =>
                    set.id !== entry.plannedSetId ||
                    props.value.sequence.some(
                        (candidate, index) => index !== sequenceIndex && candidate.plannedSetId === set.id
                    )
            ),
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
        <div class="template-form">
            <div class="button-row">
                <Button
                    onPress={(event) => {
                        trigger = event.currentTarget;
                        setMetadataOpen(true);
                    }}
                >
                    Edit
                </Button>
                <Button onPress={refreshFromCatalog}>Refresh</Button>
            </div>
            <ValidationErrors errors={props.errors} />
            <AddSetControl catalog={props.catalog} onAdd={addSet} />
            <PagedList
                label={`Sets in ${props.value.id}`}
                items={props.value.sequence.map((entry) => entry.id)}
                rowHeight={96}
                empty="No sets. Add an exercise to begin."
            >
                {(id) => {
                    const entry = () => props.value.sequence.find((item) => item.id === id);
                    const index = () => props.value.sequence.findIndex((item) => item.id === id);
                    const set = () => props.value.sets.find((candidate) => candidate.id === entry()?.plannedSetId);
                    const exercise = () =>
                        props.value.exercises.find((candidate) => candidate.id === set()?.exerciseId);
                    return (
                        <article aria-label={`Set ${index() + 1}`}>
                            <p>
                                {index() + 1}. {exercise()?.name ?? 'Unknown exercise'}
                            </p>
                            <p class="muted">
                                {(() => {
                                    const item = set();
                                    return item ? prescriptionSummary(item.prescription, app.massUnit()) : '';
                                })()}
                            </p>
                            <div class="button-row">
                                <Button
                                    onPress={(event) => {
                                        trigger = event.currentTarget;
                                        setEditing(entry()?.plannedSetId);
                                        setEditorOpen(true);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button onPress={() => duplicateOccurrence(index())}>Duplicate</Button>
                                <Button
                                    onPress={(event) => {
                                        trigger = event.currentTarget;
                                        setDeleting(index());
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                            <div class="button-row">
                                <Button disabled={index() === 0} onPress={() => moveOccurrence(index(), -1)}>
                                    Up
                                </Button>
                                <Button
                                    disabled={index() === props.value.sequence.length - 1}
                                    onPress={() => moveOccurrence(index(), 1)}
                                >
                                    Down
                                </Button>
                            </div>
                        </article>
                    );
                }}
            </PagedList>
            <Popover
                open={metadataOpen()}
                onOpenChange={setMetadataOpen}
                label="Workout details"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <TextField label="Name" value={props.value.name} required onChange={(name) => rebuild({ name })} />
                    <TextAreaField
                        label="Description"
                        value={props.value.description ?? ''}
                        onChange={(description) => rebuild({ description })}
                    />
                    <ValidationErrors errors={props.errors} />
                    <Button onPress={() => setMetadataOpen(false)}>End</Button>
                </div>
            </Popover>
            <Popover
                open={editorOpen()}
                onOpenChange={setEditorOpen}
                label="Edit planned set"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <Show when={selected()}>
                    {(selection) => (
                        <>
                            <div class="editor-fields">
                                <p>{selection().exercise.name}</p>
                                <PrescriptionFields
                                    exercise={selection().exercise}
                                    value={selection().set.prescription}
                                    onChange={(prescription) =>
                                        setAt(
                                            props.value.sets.findIndex((item) => item.id === editing()),
                                            { ...selection().set, prescription }
                                        )
                                    }
                                />
                                <ValidationErrors errors={props.errors} />
                                <Button onPress={() => setEditorOpen(false)}>End</Button>
                            </div>
                        </>
                    )}
                </Show>
            </Popover>
            <ConfirmDialog
                open={deleting() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(undefined);
                    }
                }}
                message={`Delete set ${(deleting() ?? 0) + 1}?`}
                onConfirm={() => {
                    const index = deleting();
                    if (index !== undefined) {
                        removeOccurrence(index);
                    }
                }}
                trigger={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            />
        </div>
    );
}

interface AddSetControlProps {
    catalog: ExerciseDefinition[];
    onAdd: (exerciseId: string) => void;
}

function AddSetControl(props: AddSetControlProps): JSX.Element {
    const [picking, setPicking] = createSignal(false);
    return (
        <Show when={picking()} fallback={<Button onPress={() => setPicking(true)}>Add</Button>}>
            <div class="catalog-selection">
                <div class="button-row">
                    <span>Choose exercise</span>
                    <Button onPress={() => setPicking(false)}>Cancel</Button>
                </div>
                <PagedList
                    label="Add set from catalog"
                    items={props.catalog}
                    rowHeight={48}
                    empty="Create an exercise first."
                >
                    {(exercise) => (
                        <Button
                            onPress={() => {
                                props.onAdd(exercise.id);
                                setPicking(false);
                            }}
                        >
                            {exercise.name}
                        </Button>
                    )}
                </PagedList>
            </div>
        </Show>
    );
}

export { TemplateForm };
