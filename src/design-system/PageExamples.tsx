import { createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import {
    Button,
    ConfirmDialog,
    DateSpinner,
    MultiPicker,
    PagedWindow,
    Popover,
    Spinner,
    TextArea,
    TextInput,
} from '../components/Controls/index.ts';
import { todayDate } from '../components/DateSpinner/date.ts';
import './PageExamples.css';

/** A small workout overview demonstrating summaries, actions and layered editors without persistence. */
function WorkoutExample(props: ExampleProps): JSX.Element {
    const [items, setItems] = createSignal<ExampleExercise[]>([
        {
            id: 1,
            name: 'Bench press',
            sets: 2,
            reps: 10,
            weight: 50,
            measurements: ['reps', 'weight'],
            notes: 'Keep shoulders steady.',
        },
        { id: 2, name: 'Row', sets: 3, reps: 8, weight: 45, measurements: ['reps', 'weight'], notes: '' },
        { id: 3, name: 'Squat', sets: 3, reps: 5, weight: 80, measurements: ['reps', 'weight'], notes: '' },
        { id: 4, name: 'Deadlift', sets: 2, reps: 5, weight: 100, measurements: ['reps', 'weight'], notes: '' },
        { id: 5, name: 'Press', sets: 3, reps: 8, weight: 30, measurements: ['reps', 'weight'], notes: '' },
        { id: 6, name: 'Pull-up', sets: 3, reps: 8, weight: 0, measurements: ['reps'], notes: '' },
        { id: 7, name: 'Lunge', sets: 2, reps: 10, weight: 20, measurements: ['reps', 'weight'], notes: '' },
    ]);
    const [requested, setRequested] = createSignal(1);
    const [pageSize, setPageSize] = createSignal(3);
    let overview: HTMLDivElement | undefined;
    onMount(() => {
        const observer = new ResizeObserver(() =>
            setPageSize(Math.max(1, Math.floor(((overview?.clientHeight ?? 202) - 40) / 54)))
        );
        if (overview) {
            observer.observe(overview);
        }
        onCleanup(() => observer.disconnect());
    });
    const count = () => Math.max(1, Math.ceil(items().length / pageSize()));
    const page = () => Math.min(requested(), count());
    const [editing, setEditing] = createSignal<number>();
    // Keep the selected form mounted through the reverse closing animation
    const [editorOpen, setEditorOpen] = createSignal(false);
    const selected = createMemo(() => items().find((item) => item.id === editing()));
    const [deleting, setDeleting] = createSignal<number>();
    const [notice, setNotice] = createSignal('Workout A');
    let action: HTMLElement | undefined;
    let nextId = 8;
    function patch(changes: Partial<ExampleExercise>): void {
        setItems((current) => current.map((item) => (item.id === editing() ? { ...item, ...changes } : item)));
    }
    return (
        <>
            <div class="example-workout" ref={overview}>
                <PagedWindow label="Workout overview" page={page()} count={count()} onChange={setRequested}>
                    <h1 class="example-title" role="status">
                        {notice()}
                    </h1>
                    <For
                        each={items()
                            .slice((page() - 1) * pageSize(), page() * pageSize())
                            .map((item) => item.id)}
                    >
                        {(id) => (
                            <Show when={items().find((entry) => entry.id === id)}>
                                {(item) => (
                                    <article class="example-exercise" aria-label={item().name}>
                                        <p>
                                            <span class="example-name">{item().name}</span>
                                            <span class="example-summary">
                                                {item().sets} x {item().reps} / {item().weight} kg
                                            </span>
                                        </p>
                                        <div class="example-actions">
                                            <Button
                                                onPress={(event) => {
                                                    action = event.currentTarget;
                                                    setEditing(item().id);
                                                    setEditorOpen(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                onPress={(event) => {
                                                    action = event.currentTarget;
                                                    setDeleting(item().id);
                                                }}
                                            >
                                                Delete
                                            </Button>
                                            <Button
                                                onPress={() => {
                                                    setItems((current) => [...current, { ...item(), id: nextId++ }]);
                                                    setNotice('Duplicated');
                                                }}
                                            >
                                                Duplicate
                                            </Button>
                                        </div>
                                    </article>
                                )}
                            </Show>
                        )}
                    </For>
                    <Show when={!items().length}>
                        <p>No exercises.</p>
                    </Show>
                </PagedWindow>
            </div>
            <Popover
                open={editorOpen()}
                onOpenChange={setEditorOpen}
                label="Edit exercise"
                mount={props.mount}
                anchor={() => action}
                returnFocus={() => action}
                class="example-editor"
            >
                <Show when={selected()}>
                    {(item) => (
                        <>
                            <div class="example-edit-fields">
                                <TextInput
                                    label="Name"
                                    value={item().name}
                                    onInput={(event) => patch({ name: event.currentTarget.value })}
                                />
                                <div class="example-quantities">
                                    <Spinner
                                        label="Sets"
                                        value={item().sets}
                                        onChange={(sets) => patch({ sets })}
                                        popoverMount={props.mount}
                                    />
                                    <Spinner
                                        label="Reps"
                                        value={item().reps}
                                        onChange={(reps) => patch({ reps })}
                                        popoverMount={props.mount}
                                    />
                                    <Spinner
                                        label="kg"
                                        value={item().weight}
                                        onChange={(weight) => patch({ weight })}
                                        step={2.5}
                                        integerDigits={3}
                                        fractionDigits={1}
                                        popoverMount={props.mount}
                                    />
                                </div>
                                <MultiPicker
                                    label="Measures"
                                    values={item().measurements}
                                    onChange={(measurements) => patch({ measurements })}
                                    options={measurementOptions}
                                    popoverMount={props.mount}
                                />
                                <TextArea
                                    label="Notes"
                                    rows={2}
                                    value={item().notes}
                                    onChange={(notes) => patch({ notes })}
                                />
                            </div>
                            <Button onPress={() => setEditorOpen(false)}>End</Button>
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
                message={`Delete ${items().find((item) => item.id === deleting())?.name ?? 'exercise'}?`}
                mount={props.mount}
                trigger={() => action}
                onConfirm={() => {
                    setItems((current) => current.filter((item) => item.id !== deleting()));
                    setNotice('Deleted');
                }}
            />
        </>
    );
}

/** A frequent bodyweight flow, with adjacent-day entry and a rarely needed native calendar. */
function WeightExample(props: ExampleProps): JSX.Element {
    const [date, setDate] = createSignal(todayDate());
    const [weight, setWeight] = createSignal(75);
    const [message, setMessage] = createSignal('Today or yesterday.');
    return (
        <section class="ds-section example-weight" aria-label="Record weight">
            <DateSpinner label="Date" value={date()} onChange={setDate} />
            <Spinner
                label="Weight (kg)"
                value={weight()}
                onChange={setWeight}
                popoverMount={props.mount}
                step={0.1}
                integerDigits={3}
                fractionDigits={1}
            />
            <Button onPress={() => setMessage(`${date().replaceAll('-', '.')}: ${weight().toFixed(1)} kg recorded.`)}>
                Record
            </Button>
            <p role="status">{message()}</p>
        </section>
    );
}

/** A standalone summary proposal showing zero, few and many selected memberships. */
function MembershipExample(props: ExampleProps): JSX.Element {
    const [values, setValues] = createSignal(['reps', 'weight', 'time', 'distance']);
    return (
        <section class="ds-section">
            <MultiPicker
                label="Measures"
                values={values()}
                onChange={setValues}
                options={measurementOptions}
                popoverMount={props.mount}
            />
            <p class="ds-note">
                Two names, then +count.
                <br />
                None when empty.
                <br />
                Choose freely, then End.
            </p>
        </section>
    );
}

const measurementOptions = [
    { value: 'reps', label: 'Reps' },
    { value: 'weight', label: 'Weight' },
    { value: 'time', label: 'Time' },
    { value: 'distance', label: 'Distance' },
];

/** Demo composition shares only a portal surface with the real components. */
interface ExampleProps {
    mount: HTMLElement;
}
interface ExampleExercise {
    id: number;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    measurements: string[];
    notes: string;
}

export { MembershipExample, WeightExample, WorkoutExample };
