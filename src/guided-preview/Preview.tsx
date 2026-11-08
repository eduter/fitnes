import { createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import {
    Button,
    DialogActions,
    DialogTitle,
    MoveButton,
    OptionPicker,
    PagedWindow,
    PageTitle,
    Popover,
    SectionHeading,
    Spinner,
} from '../components/Controls/index.ts';
import { SteelPanel } from '../components/SteelPanel/SteelPanel.tsx';
import { elapsedAt, type GuidedStep, guidedPosition, resolveTiming, type Timing } from './timeline.ts';
import '../styles/global.css';
import './preview.css';

const exercises = [
    { value: 'squat', label: 'Squat', timed: false },
    { value: 'row', label: 'Dumbbell row', timed: false },
    { value: 'plank', label: 'Plank', timed: true },
];
const initialSteps: GuidedStep[] = [
    { id: 's1', kind: 'set', exercise: 'squat', target: 8, load: 40 },
    { id: 's2', kind: 'set', exercise: 'row', target: 8, load: 12 },
    { id: 'r1', kind: 'rest', seconds: 60 },
    { id: 's3', kind: 'set', exercise: 'squat', target: 8, load: 40 },
    { id: 's4', kind: 'set', exercise: 'row', target: 8, load: 12 },
    { id: 'r2', kind: 'rest', seconds: 90 },
    { id: 's5', kind: 'set', exercise: 'plank', target: 30, load: 0 },
];

/** Isolated interactive prototype of the owner's guided, arbitrarily ordered workout. */
function Preview(): JSX.Element {
    const [steps, setSteps] = createSignal<GuidedStep[]>(structuredClone(initialSteps));
    const [defaults, setDefaults] = createSignal<Record<string, Timing>>({
        squat: { prep: 8, pace: 3 },
        row: { prep: 5, pace: 2 },
        plank: { prep: 10, pace: 3 },
    });
    const [overrides, setOverrides] = createSignal<Record<string, Partial<Timing>>>({});
    const [index, setIndex] = createSignal(0);
    const [view, setView] = createSignal<'track' | 'plan'>('track');
    const [editor, setEditor] = createSignal<'timing' | 'step'>();
    const [selectedExercise, setSelectedExercise] = createSignal('squat');
    const [selectedId, setSelectedId] = createSignal('s1');
    const [page, setPage] = createSignal(1);
    const [pageSize, setPageSize] = createSignal(3);
    const [running, setRunning] = createSignal(false);
    const [started, setStarted] = createSignal(false);
    const [accumulated, setAccumulated] = createSignal(0);
    const [anchor, setAnchor] = createSignal<number>();
    const [now, setNow] = createSignal(Date.now());
    const [actual, setActual] = createSignal(0);
    const [results, setResults] = createSignal<Record<string, { value: number; skipped: boolean }>>({});
    const [wakeStatus, setWakeStatus] = createSignal('');
    const [mount, setMount] = createSignal<HTMLDivElement>();
    let wake: WakeLockSentinel | undefined;
    let disposed = false;
    let editorTrigger: HTMLElement | undefined;
    let nextId = 20;
    const current = createMemo(() => steps()[index()]);
    const finished = () => index() >= steps().length;
    const exercise = () => {
        const step = current();
        return exercises.find((item) => item.value === (step?.kind === 'set' ? step.exercise : ''));
    };
    const timing = () => {
        const step = current();
        return step?.kind === 'set'
            ? resolveTiming(defaults()[step.exercise], overrides()[step.exercise])
            : { prep: 0, pace: 1 };
    };
    const duration = () => {
        const step = current();
        if (!step) {
            return 1;
        }
        if (step.kind === 'rest') {
            return step.seconds;
        }
        return exercise()?.timed ? step.target : step.target * timing().pace;
    };
    const position = createMemo(() =>
        guidedPosition(
            elapsedAt(accumulated(), anchor(), now()),
            timing().prep,
            duration(),
            exercise()?.timed || current()?.kind === 'rest' ? undefined : timing().pace
        )
    );
    const done = () => started() && position().phase === 'done';
    const editing = () => steps().find((step) => step.id === selectedId());
    const locked = () => started() || Object.keys(results()).length > 0;
    const next = () => steps()[index() + 1];
    const label = (step: GuidedStep | undefined) =>
        !step
            ? 'Finish workout'
            : step.kind === 'rest'
              ? `Rest ${step.seconds}s`
              : (exercises.find((item) => item.value === step.exercise)?.label ?? step.exercise);

    async function keepAwake(): Promise<void> {
        if (!('wakeLock' in navigator)) {
            setWakeStatus('Keep your screen on manually.');
            return;
        }
        if (wake && !wake.released) {
            return;
        }
        try {
            const acquired = await navigator.wakeLock.request('screen');
            if (disposed || !started() || document.visibilityState !== 'visible') {
                await acquired.release();
                return;
            }
            wake = acquired;
            setWakeStatus('Screen stays on');
            acquired.addEventListener('release', () => setWakeStatus('Screen lock released'));
        } catch {
            setWakeStatus('Keep your screen on manually.');
        }
    }

    function start(): void {
        setNow(Date.now());
        setAnchor(Date.now());
        setRunning(true);
        setStarted(true);
        void keepAwake();
    }

    function pause(): void {
        setAccumulated(elapsedAt(accumulated(), anchor(), Date.now()));
        setAnchor(undefined);
        setNow(Date.now());
        setRunning(false);
    }

    function resetClock(): void {
        setRunning(false);
        setStarted(false);
        setAnchor(undefined);
        setAccumulated(0);
        setNow(Date.now());
        setActual(0);
    }

    function advance(skipped = false, recordedValue?: number): void {
        const step = current();
        if (!step) {
            return;
        }
        const value = recordedValue ?? (step.kind === 'set' ? actual() : step.seconds);
        setResults({ ...results(), [step.id]: { value, skipped } });
        const shouldStartRest = next()?.kind === 'rest';
        resetClock();
        setIndex(index() + 1);
        if (shouldStartRest) {
            start();
        }
        if (finished()) {
            void wake?.release();
            setWakeStatus('');
        }
    }

    function restart(): void {
        resetClock();
        setIndex(0);
        setResults({});
        void wake?.release();
        setWakeStatus('');
    }

    function openEditor(kind: 'timing' | 'step', trigger: HTMLElement, id?: string): void {
        editorTrigger = trigger;
        if (id) {
            setSelectedId(id);
        }
        setEditor(kind);
    }

    function changeStep(patch: Partial<GuidedStep>): void {
        setSteps(steps().map((step) => (step.id === selectedId() ? ({ ...step, ...patch } as GuidedStep) : step)));
    }

    function move(id: string, delta: number): void {
        const list = [...steps()];
        const from = list.findIndex((step) => step.id === id);
        const to = from + delta;
        if (to < 0 || to >= list.length) {
            return;
        }
        [list[from], list[to]] = [list[to], list[from]];
        setSteps(list);
        setPage(Math.floor(to / pageSize()) + 1);
    }

    function updateTiming(field: keyof Timing, value: number, override: boolean): void {
        const id = selectedExercise();
        if (override) {
            setOverrides({ ...overrides(), [id]: { ...overrides()[id], [field]: value } });
            return;
        }
        setDefaults({ ...defaults(), [id]: { ...defaults()[id], [field]: value } });
    }

    onMount(() => {
        const timer = window.setInterval(() => {
            if (!running()) {
                return;
            }
            setNow(Date.now());
            if (done()) {
                setActual(current()?.kind === 'set' ? (current() as Extract<GuidedStep, { kind: 'set' }>).target : 0);
                pause();
            }
        }, 50);
        function visible(): void {
            if (document.visibilityState === 'visible' && started() && !finished()) {
                void keepAwake();
            }
        }
        function scale(): void {
            const ratio = window.devicePixelRatio || 1;
            const factor = Math.max(1, Math.min(2, Math.floor((window.innerWidth * ratio) / 256) / ratio));
            document.documentElement.style.setProperty('--screen-scale', String(factor));
            const rows = Math.max(1, Math.floor((window.innerHeight / factor - 240) / 96));
            setPageSize(rows);
            setPage(Math.min(page(), Math.max(1, Math.ceil(steps().length / rows))));
        }
        scale();
        window.addEventListener('resize', scale);
        document.addEventListener('visibilitychange', visible);
        onCleanup(() => {
            disposed = true;
            clearInterval(timer);
            window.removeEventListener('resize', scale);
            document.removeEventListener('visibilitychange', visible);
            void wake?.release();
        });
    });

    return (
        <div ref={setMount} class="guided-preview">
            <SteelPanel class="guided-panel">
                <main class="guided-page">
                    <header class="guided-header">
                        <PageTitle>
                            {view() === 'plan' ? 'Sequence' : finished() ? 'Complete' : label(current())}
                        </PageTitle>
                        <Button
                            onPress={() => {
                                if (running()) {
                                    pause();
                                }
                                setView(view() === 'track' ? 'plan' : 'track');
                                setPage(1);
                            }}
                        >
                            {view() === 'track' ? 'Plan' : 'Back'}
                        </Button>
                    </header>
                    <Show
                        when={view() === 'track'}
                        fallback={
                            <>
                                <p>Sets and rests, in your order.</p>
                                <Show when={locked()}>
                                    <p>Restart to change the plan.</p>
                                    <Button onPress={restart}>Restart</Button>
                                </Show>
                                <div class="guided-plan-list">
                                    <PagedWindow
                                        label="Workout sequence"
                                        page={page()}
                                        count={Math.max(1, Math.ceil(steps().length / pageSize()))}
                                        onChange={setPage}
                                    >
                                        <For each={steps().slice((page() - 1) * pageSize(), page() * pageSize())}>
                                            {(step) => (
                                                <div class="guided-step-row">
                                                    <p>
                                                        {steps().findIndex((item) => item.id === step.id) + 1}.{' '}
                                                        {label(step)}
                                                    </p>
                                                    <p>
                                                        {step.kind === 'rest'
                                                            ? 'Rest'
                                                            : `${step.target} ${exercises.find((item) => item.value === step.exercise)?.timed ? 'seconds' : 'reps'} · ${step.load} kg`}
                                                    </p>
                                                    <div class="guided-actions">
                                                        <Button
                                                            disabled={locked()}
                                                            onPress={(event) =>
                                                                openEditor('step', event.currentTarget, step.id)
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            disabled={locked() || steps().length === 1}
                                                            onPress={() => {
                                                                setSteps(steps().filter((item) => item.id !== step.id));
                                                                setPage(
                                                                    Math.min(
                                                                        page(),
                                                                        Math.ceil(steps().length / pageSize())
                                                                    )
                                                                );
                                                            }}
                                                        >
                                                            Delete
                                                        </Button>
                                                        <MoveButton
                                                            direction="up"
                                                            label={`Move ${label(step)} up`}
                                                            disabled={locked() || steps()[0].id === step.id}
                                                            onPress={() => move(step.id, -1)}
                                                        />
                                                        <MoveButton
                                                            direction="down"
                                                            label={`Move ${label(step)} down`}
                                                            disabled={locked() || steps().at(-1)?.id === step.id}
                                                            onPress={() => move(step.id, 1)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </PagedWindow>
                                </div>
                                <div class="guided-actions">
                                    <Button
                                        disabled={locked()}
                                        onPress={() => {
                                            setSteps([
                                                ...steps(),
                                                {
                                                    id: `s${nextId++}`,
                                                    kind: 'set',
                                                    exercise: 'squat',
                                                    target: 8,
                                                    load: 40,
                                                },
                                            ]);
                                            setPage(Math.ceil(steps().length / pageSize()));
                                        }}
                                    >
                                        Add set
                                    </Button>
                                    <Button
                                        disabled={locked()}
                                        onPress={() => {
                                            setSteps([...steps(), { id: `r${nextId++}`, kind: 'rest', seconds: 60 }]);
                                            setPage(Math.ceil(steps().length / pageSize()));
                                        }}
                                    >
                                        Add rest
                                    </Button>
                                </div>
                                <Button
                                    disabled={locked()}
                                    onPress={(event) => openEditor('timing', event.currentTarget)}
                                >
                                    Timing
                                </Button>
                            </>
                        }
                    >
                        <Show
                            when={!finished()}
                            fallback={
                                <div class="guided-finish">
                                    <SectionHeading>Workout complete</SectionHeading>
                                    <p>
                                        {Object.values(results()).filter((item) => !item.skipped).length} steps
                                        completed
                                    </p>
                                    <p>{Object.values(results()).filter((item) => item.skipped).length} skipped</p>
                                    <For each={steps().filter((step) => step.kind === 'set')}>
                                        {(step) => (
                                            <p>
                                                {label(step)}:{' '}
                                                {results()[step.id]?.skipped
                                                    ? 'Skipped'
                                                    : `${results()[step.id]?.value ?? 0} ${step.kind === 'set' && exercises.find((item) => item.value === step.exercise)?.timed ? 's' : 'reps'}`}
                                            </p>
                                        )}
                                    </For>
                                    <Button onPress={restart}>Restart</Button>
                                </div>
                            }
                        >
                            <p>
                                Step {index() + 1} of {steps().length}
                            </p>
                            <div class="guided-prescription">
                                <Show when={current()?.kind === 'set'}>
                                    <p>
                                        {(current() as Extract<GuidedStep, { kind: 'set' }>).target}{' '}
                                        {exercise()?.timed ? 'seconds' : 'reps'}
                                        {(current() as Extract<GuidedStep, { kind: 'set' }>).load > 0
                                            ? ` · ${(current() as Extract<GuidedStep, { kind: 'set' }>).load} kg`
                                            : ''}
                                    </p>
                                    <p>
                                        {timing().prep}s prep{exercise()?.timed ? '' : ` · ${timing().pace}s per rep`}
                                    </p>
                                </Show>
                            </div>
                            <div class="guided-focus">
                                <div class="guided-status">
                                    <Show when={started()}>
                                        <p role="status">
                                            {done()
                                                ? current()?.kind === 'rest'
                                                    ? 'Rest complete'
                                                    : 'Set complete'
                                                : !running()
                                                  ? 'Paused'
                                                  : position().phase === 'prep'
                                                    ? 'Get into position'
                                                    : current()?.kind === 'rest'
                                                      ? 'Rest · time remaining'
                                                      : exercise()?.timed
                                                        ? 'Time remaining'
                                                        : 'Reps completed'}
                                        </p>
                                    </Show>
                                </div>
                                <div
                                    class="guided-counter"
                                    role="timer"
                                    aria-label={
                                        !started()
                                            ? 'Ready'
                                            : `${position().phase === 'prep' ? 'Prepare' : current()?.kind === 'rest' || exercise()?.timed ? 'Seconds remaining' : 'Repetitions completed'}: ${position().phase === 'prep' || current()?.kind === 'rest' || exercise()?.timed ? position().remaining : position().reps}`
                                    }
                                >
                                    {!started()
                                        ? current()?.kind === 'rest'
                                            ? clock(duration())
                                            : exercise()?.timed
                                              ? clock(duration())
                                              : `0/${(current() as Extract<GuidedStep, { kind: 'set' }>).target}`
                                        : position().phase === 'prep'
                                          ? position().remaining
                                          : current()?.kind === 'rest' || exercise()?.timed
                                            ? clock(position().remaining)
                                            : `${position().reps}/${(current() as Extract<GuidedStep, { kind: 'set' }>).target}`}
                                </div>
                                <div class="guided-cue">
                                    <Show
                                        when={
                                            started() &&
                                            current()?.kind === 'set' &&
                                            !exercise()?.timed &&
                                            position().phase !== 'prep' &&
                                            !done()
                                        }
                                    >
                                        <p>
                                            Next rep in{' '}
                                            {Math.max(
                                                1,
                                                Math.ceil(
                                                    timing().pace -
                                                        (Math.max(
                                                            0,
                                                            elapsedAt(accumulated(), anchor(), now()) / 1000 -
                                                                timing().prep
                                                        ) %
                                                            timing().pace)
                                                )
                                            )}
                                            s
                                        </p>
                                    </Show>
                                </div>
                                <div class="guided-meter" aria-hidden="true">
                                    <For each={Array.from({ length: 16 })}>
                                        {(_, i) => (
                                            <span
                                                classList={{
                                                    filled: started() && position().fraction >= (i() + 1) / 16,
                                                }}
                                            />
                                        )}
                                    </For>
                                </div>
                                <div class="guided-control-slot">
                                    <Show
                                        when={!started()}
                                        fallback={
                                            <Show when={!done()}>
                                                <Button onPress={() => (running() ? pause() : start())}>
                                                    {running() ? 'Pause' : 'Resume'}
                                                </Button>
                                            </Show>
                                        }
                                    >
                                        <Button onPress={start}>Start</Button>
                                    </Show>
                                </div>
                                <div class="guided-result-slot">
                                    <Show when={done() && current()?.kind === 'set'}>
                                        <Spinner
                                            label={exercise()?.timed ? 'Actual seconds' : 'Actual reps'}
                                            value={actual()}
                                            onChange={setActual}
                                            max={999}
                                            integerDigits={3}
                                            popoverMount={mount()}
                                        />
                                    </Show>
                                </div>
                                <div class="guided-log-slot">
                                    <Show when={started() && current()?.kind === 'set'}>
                                        <Button
                                            class="guided-primary"
                                            onPress={() => {
                                                const elapsed = elapsedAt(accumulated(), anchor(), Date.now());
                                                const value = done()
                                                    ? actual()
                                                    : exercise()?.timed
                                                      ? Math.floor(Math.max(0, elapsed / 1000 - timing().prep))
                                                      : position().reps;
                                                advance(false, value);
                                            }}
                                        >
                                            Log
                                        </Button>
                                    </Show>
                                    <Show when={done() && current()?.kind === 'rest'}>
                                        <Button class="guided-primary" onPress={() => advance()}>
                                            Next
                                        </Button>
                                    </Show>
                                </div>
                            </div>
                            <div class="guided-bottom">
                                <p>Next: {label(next())}</p>
                                <div class="guided-actions">
                                    <Button onPress={() => advance(true)}>Skip</Button>
                                    <Show when={!started()}>
                                        <Button
                                            onPress={(event) => {
                                                const step = current();
                                                if (step?.kind === 'set') {
                                                    setSelectedExercise(step.exercise);
                                                    openEditor('timing', event.currentTarget);
                                                } else if (step) {
                                                    openEditor('step', event.currentTarget, step.id);
                                                }
                                            }}
                                        >
                                            Timing
                                        </Button>
                                    </Show>
                                    <Show when={started() && !running() && !done()}>
                                        <Button onPress={resetClock}>Reset</Button>
                                    </Show>
                                </div>
                                <p class="guided-wake">{wakeStatus()}</p>
                            </div>
                        </Show>
                    </Show>
                    <footer class="guided-caption">Preview · sample data · resets on reload</footer>
                </main>
            </SteelPanel>
            <Popover
                open={editor() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditor(undefined);
                    }
                }}
                label={editor() === 'timing' ? 'Exercise timing' : 'Edit step'}
                mount={mount()}
                width={224}
                returnFocus={() => editorTrigger}
            >
                <div class="guided-editor">
                    <DialogTitle>{editor() === 'timing' ? 'Exercise timing' : 'Edit step'}</DialogTitle>
                    <Show
                        when={editor() === 'timing'}
                        fallback={
                            <Show when={editing()}>
                                {(step) => (
                                    <Show
                                        when={step().kind === 'rest'}
                                        fallback={
                                            <>
                                                <OptionPicker
                                                    label="Exercise"
                                                    value={(step() as Extract<GuidedStep, { kind: 'set' }>).exercise}
                                                    options={exercises}
                                                    onChange={(exercise) => changeStep({ exercise })}
                                                    popoverMount={mount()}
                                                />
                                                <Spinner
                                                    label="Target reps / seconds"
                                                    value={(step() as Extract<GuidedStep, { kind: 'set' }>).target}
                                                    min={1}
                                                    max={999}
                                                    integerDigits={3}
                                                    onChange={(target) => changeStep({ target })}
                                                    popoverMount={mount()}
                                                />
                                                <Spinner
                                                    label="Load kg"
                                                    value={(step() as Extract<GuidedStep, { kind: 'set' }>).load}
                                                    max={999}
                                                    integerDigits={3}
                                                    onChange={(load) => changeStep({ load })}
                                                    popoverMount={mount()}
                                                />
                                            </>
                                        }
                                    >
                                        <Spinner
                                            label="Rest seconds"
                                            value={(step() as Extract<GuidedStep, { kind: 'rest' }>).seconds}
                                            min={1}
                                            max={999}
                                            integerDigits={3}
                                            onChange={(seconds) => changeStep({ seconds })}
                                            popoverMount={mount()}
                                        />
                                    </Show>
                                )}
                            </Show>
                        }
                    >
                        <OptionPicker
                            label="Exercise"
                            value={selectedExercise()}
                            options={exercises}
                            onChange={setSelectedExercise}
                            popoverMount={mount()}
                        />
                        <SectionHeading>Exercise defaults</SectionHeading>
                        <div class="guided-fields">
                            <Spinner
                                label="Prep s"
                                value={defaults()[selectedExercise()].prep}
                                max={99}
                                onChange={(v) => updateTiming('prep', v, false)}
                                popoverMount={mount()}
                            />
                            <Show when={!exercises.find((item) => item.value === selectedExercise())?.timed}>
                                <Spinner
                                    label="Rep s"
                                    value={defaults()[selectedExercise()].pace}
                                    min={0.5}
                                    max={9.9}
                                    integerDigits={1}
                                    fractionDigits={1}
                                    step={0.5}
                                    onChange={(v) => updateTiming('pace', v, false)}
                                    popoverMount={mount()}
                                />
                            </Show>
                        </div>
                        <SectionHeading>This workout</SectionHeading>
                        <For
                            each={(['prep', 'pace'] as const).filter(
                                (field) =>
                                    field === 'prep' ||
                                    !exercises.find((item) => item.value === selectedExercise())?.timed
                            )}
                        >
                            {(field) => (
                                <div class="guided-fields">
                                    <OptionPicker
                                        label={field === 'prep' ? 'Preparation' : 'Rep pace'}
                                        value={
                                            overrides()[selectedExercise()]?.[field] === undefined
                                                ? 'inherit'
                                                : 'override'
                                        }
                                        options={[
                                            { value: 'inherit', label: 'Default' },
                                            { value: 'override', label: 'Override' },
                                        ]}
                                        onChange={(value) => {
                                            const id = selectedExercise();
                                            const next = { ...overrides()[id] };
                                            if (value === 'inherit') {
                                                delete next[field];
                                            } else {
                                                next[field] = defaults()[id][field];
                                            }
                                            setOverrides({ ...overrides(), [id]: next });
                                        }}
                                        popoverMount={mount()}
                                    />
                                    <Show when={overrides()[selectedExercise()]?.[field] !== undefined}>
                                        <Spinner
                                            label="Seconds"
                                            value={overrides()[selectedExercise()]?.[field] ?? 0}
                                            min={field === 'pace' ? 0.5 : 0}
                                            max={field === 'pace' ? 9.9 : 99}
                                            integerDigits={field === 'pace' ? 1 : 2}
                                            fractionDigits={field === 'pace' ? 1 : 0}
                                            step={field === 'pace' ? 0.5 : 1}
                                            onChange={(value) => updateTiming(field, value, true)}
                                            popoverMount={mount()}
                                        />
                                    </Show>
                                </div>
                            )}
                        </For>
                    </Show>
                    <DialogActions kind="end" onConfirm={() => setEditor(undefined)} />
                </div>
            </Popover>
        </div>
    );
}

function clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const root = document.getElementById('root');
if (!root) {
    throw new Error('Guided preview requires #root');
}
render(() => <Preview />, root);
