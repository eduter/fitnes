import { createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../../app/AppData.tsx';
import { createWorkoutTemplate, refreshTemplateExercises } from '../../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../../domain/defaultPrescription.ts';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import { generatePlannedSetId, generateSequenceEntryId } from '../../domain/generateIds.ts';
import type { SetPrescription } from '../../domain/prescription.ts';
import type { ValidationIssue } from '../../domain/validation.ts';
import type { PlannedSet, WorkoutTemplate } from '../../domain/workoutTemplate.ts';
import {
    Button,
    ConfirmDialog,
    DialogActions,
    DialogTitle,
    MoveButton,
    OptionPicker,
    Popover,
    SectionHeading,
    Spinner,
} from '../Controls/index.ts';
import { TextAreaField, TextField } from '../fields.tsx';
import { PagedList } from '../PagedList.tsx';
import { PrescriptionFields } from '../prescription/PrescriptionFields.tsx';
import { TimingFields } from '../session/TimingFields.tsx';
import { ValidationErrors } from '../ValidationErrors.tsx';
import { prescriptionSummary } from './prescriptionSummary.ts';

interface TemplateFormProps {
    value: WorkoutTemplate;
    catalog: ExerciseDefinition[];
    errors: ValidationIssue[];
    onChange: (value: WorkoutTemplate, errors: ValidationIssue[]) => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    duplicating?: boolean;
}

/** Edit a template's metadata, planned sets, and execution sequence. */
function TemplateForm(props: TemplateFormProps): JSX.Element {
    const app = useAppData();
    const [editing, setEditing] = createSignal<string>();
    const [editorOpen, setEditorOpen] = createSignal(false);
    const [metadataOpen, setMetadataOpen] = createSignal(false);
    const [deleting, setDeleting] = createSignal<number>();
    const [moreOpen, setMoreOpen] = createSignal(false);
    const [timingOpen, setTimingOpen] = createSignal(false);
    const [timingExercise, setTimingExercise] = createSignal('');
    const [restEditing, setRestEditing] = createSignal<string>();
    let moreTrigger: HTMLElement | undefined;
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
            timingOverrides: Object.fromEntries(
                Object.entries(overrides.timingOverrides ?? props.value.timingOverrides ?? {}).filter(([id]) =>
                    (overrides.sets ?? props.value.sets).some((set) => set.exerciseId === id)
                )
            ),
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

    function addSet(exerciseId: string, prescription: SetPrescription): void {
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
                { id: plannedSetId, exerciseId: exercise.id, prescription: structuredClone(prescription) },
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
        if (entry?.restSeconds !== undefined) {
            const sequence = [...props.value.sequence];
            sequence.splice(sequenceIndex + 1, 0, { id: generateSequenceEntryId(), restSeconds: entry.restSeconds });
            rebuild({ sequence });
            return;
        }
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
                    Details
                </Button>
                <AddSetControl catalog={props.catalog} onAdd={addSet} />
                <Button
                    onPress={() =>
                        rebuild({
                            sequence: [...props.value.sequence, { id: generateSequenceEntryId(), restSeconds: 60 }],
                        })
                    }
                >
                    Add rest
                </Button>
                <Button
                    onPress={(event) => {
                        moreTrigger = event.currentTarget;
                        setMoreOpen(true);
                    }}
                >
                    More
                </Button>
            </div>
            <ValidationErrors errors={props.errors} />
            <SectionHeading>Sequence</SectionHeading>
            <PagedList
                label={`Sets in ${props.value.id}`}
                items={props.value.sequence.map((entry) => entry.id)}
                rowHeight={64}
                empty="No sets. Add an exercise to begin."
            >
                {(id) => {
                    const entry = () => props.value.sequence.find((item) => item.id === id);
                    const index = () => props.value.sequence.findIndex((item) => item.id === id);
                    const set = () => props.value.sets.find((candidate) => candidate.id === entry()?.plannedSetId);
                    const exercise = () =>
                        props.value.exercises.find((candidate) => candidate.id === set()?.exerciseId);
                    return (
                        <article aria-label={`${entry()?.restSeconds !== undefined ? 'Rest' : 'Set'} ${index() + 1}`}>
                            <p>
                                {index() + 1}.{' '}
                                {entry()?.restSeconds !== undefined
                                    ? `Rest ${entry()?.restSeconds}s`
                                    : (exercise()?.name ?? 'Unknown exercise')}
                            </p>
                            <p class="muted">
                                {(() => {
                                    const item = set();
                                    return item ? prescriptionSummary(item.prescription, app.massUnit()) : '';
                                })()}
                            </p>
                            <div class="button-row set-actions">
                                <Button
                                    onPress={(event) => {
                                        trigger = event.currentTarget;
                                        if (entry()?.restSeconds !== undefined) {
                                            setRestEditing(entry()?.id);
                                        } else {
                                            setEditing(entry()?.plannedSetId);
                                            setEditorOpen(true);
                                        }
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
                                <MoveButton
                                    label={`Move ${entry()?.restSeconds !== undefined ? 'rest' : 'set'} ${index() + 1} up`}
                                    direction="up"
                                    disabled={index() === 0}
                                    onPress={() => moveOccurrence(index(), -1)}
                                />
                                <MoveButton
                                    label={`Move ${entry()?.restSeconds !== undefined ? 'rest' : 'set'} ${index() + 1} down`}
                                    direction="down"
                                    disabled={index() === props.value.sequence.length - 1}
                                    onPress={() => moveOccurrence(index(), 1)}
                                />
                            </div>
                        </article>
                    );
                }}
            </PagedList>
            <Popover
                open={restEditing() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setRestEditing(undefined);
                    }
                }}
                label="Edit rest"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <DialogTitle>Rest</DialogTitle>
                    <Spinner
                        label="Rest seconds"
                        value={props.value.sequence.find((entry) => entry.id === restEditing())?.restSeconds ?? 60}
                        min={1}
                        max={9999}
                        integerDigits={4}
                        onChange={(restSeconds) =>
                            rebuild({
                                sequence: props.value.sequence.map((entry) =>
                                    entry.id === restEditing() ? { ...entry, restSeconds } : entry
                                ),
                            })
                        }
                        popoverMount={document.getElementById('root') ?? undefined}
                    />
                    <DialogActions kind="end" onConfirm={() => setRestEditing(undefined)} />
                </div>
            </Popover>
            <Popover
                open={timingOpen()}
                onOpenChange={setTimingOpen}
                label="Workout timing"
                returnFocus={() => moreTrigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <DialogTitle>Workout timing</DialogTitle>
                    <OptionPicker
                        label="Exercise"
                        value={timingExercise()}
                        options={props.value.exercises.map((exercise) => ({
                            value: exercise.id,
                            label: exercise.name,
                        }))}
                        onChange={setTimingExercise}
                        popoverMount={document.getElementById('root') ?? undefined}
                    />
                    <TimingFields
                        inherit
                        defaults={props.value.exercises.find((exercise) => exercise.id === timingExercise())?.timing}
                        value={props.value.timingOverrides?.[timingExercise()]}
                        onChange={(timing) =>
                            rebuild({ timingOverrides: { ...props.value.timingOverrides, [timingExercise()]: timing } })
                        }
                    />
                    <DialogActions kind="end" onConfirm={() => setTimingOpen(false)} />
                </div>
            </Popover>
            <Popover
                open={metadataOpen()}
                onOpenChange={setMetadataOpen}
                label="Workout details"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <DialogTitle>Workout details</DialogTitle>
                    <TextField label="Name" value={props.value.name} required onChange={(name) => rebuild({ name })} />
                    <TextAreaField
                        label="Description"
                        value={props.value.description ?? ''}
                        onChange={(description) => rebuild({ description })}
                    />
                    <ValidationErrors errors={props.errors} />
                    <DialogActions kind="end" onConfirm={() => setMetadataOpen(false)} />
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
                                <DialogTitle>{selection().exercise.name}</DialogTitle>
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
                                <DialogActions kind="end" onConfirm={() => setEditorOpen(false)} />
                            </div>
                        </>
                    )}
                </Show>
            </Popover>
            <Popover
                open={moreOpen()}
                onOpenChange={setMoreOpen}
                label="Workout actions"
                anchor={() => moreTrigger}
                returnFocus={() => moreTrigger}
                mount={document.getElementById('root') ?? undefined}
                width={144}
            >
                <div class="action-menu">
                    <Button
                        disabled={props.value.exercises.length === 0}
                        onPress={() => {
                            setMoreOpen(false);
                            setTimingExercise(props.value.exercises[0]?.id ?? '');
                            setTimingOpen(true);
                        }}
                    >
                        Timing
                    </Button>
                    <Show when={props.onDuplicate}>
                        <Button
                            disabled={props.duplicating}
                            onPress={() => {
                                setMoreOpen(false);
                                props.onDuplicate?.();
                            }}
                        >
                            Duplicate
                        </Button>
                    </Show>
                    <Button
                        onPress={() => {
                            setMoreOpen(false);
                            refreshFromCatalog();
                        }}
                    >
                        Refresh
                    </Button>
                    <Show when={props.onDelete}>
                        <Button
                            onPress={() => {
                                setMoreOpen(false);
                                props.onDelete?.();
                            }}
                        >
                            Delete
                        </Button>
                    </Show>
                    <DialogActions kind="end" onConfirm={() => setMoreOpen(false)} />
                </div>
            </Popover>
            <ConfirmDialog
                open={deleting() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(undefined);
                    }
                }}
                message={`Delete ${props.value.sequence[deleting() ?? 0]?.restSeconds !== undefined ? 'rest' : 'set'} ${(deleting() ?? 0) + 1}?`}
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
    onAdd: (exerciseId: string, prescription: SetPrescription) => void;
}

function AddSetControl(props: AddSetControlProps): JSX.Element {
    const [picking, setPicking] = createSignal(false);
    const [exerciseId, setExerciseId] = createSignal('');
    const [prescription, setPrescription] = createSignal<SetPrescription>();
    let trigger: HTMLElement | undefined;
    const exercise = () => props.catalog.find((item) => item.id === exerciseId());
    function choose(id: string): void {
        const item = props.catalog.find((candidate) => candidate.id === id);
        if (!item) {
            return;
        }
        setExerciseId(id);
        setPrescription(defaultPrescription(item));
    }
    return (
        <>
            <Button
                onPress={(event) => {
                    trigger = event.currentTarget;
                    choose(props.catalog[0]?.id ?? '');
                    setPicking(true);
                }}
            >
                Add
            </Button>
            <Popover
                open={picking()}
                onOpenChange={setPicking}
                label="Add set"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <DialogTitle>Add set</DialogTitle>
                    <Show when={exercise() && prescription()} fallback={<p>Create an exercise first.</p>}>
                        <OptionPicker
                            label="Exercise"
                            value={exerciseId()}
                            options={props.catalog.map((item) => ({ value: item.id, label: item.name }))}
                            onChange={choose}
                            popoverMount={document.getElementById('root') ?? undefined}
                        />
                        <Show when={exercise()}>
                            {(item) => (
                                <PrescriptionFields
                                    exercise={item()}
                                    value={prescription() as SetPrescription}
                                    onChange={setPrescription}
                                />
                            )}
                        </Show>
                    </Show>
                    <DialogActions
                        kind="add"
                        confirmDisabled={!exercise() || !prescription()}
                        onCancel={() => setPicking(false)}
                        onConfirm={() => {
                            const value = prescription();
                            if (!value || !exercise()) {
                                return;
                            }
                            props.onAdd(exerciseId(), value);
                            setPicking(false);
                        }}
                    />
                </div>
            </Popover>
        </>
    );
}

export { TemplateForm };
