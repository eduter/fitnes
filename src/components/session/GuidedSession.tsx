import { addedWeightLabel } from '../../copy/exercise.ts';
import { type } from 'arktype';
import { batch, createEffect, createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { massValue } from '../../domain/convertWeight.ts';
import { elapsedAt, guidedPosition } from '../../domain/guidedProgress.ts';
import type { SequenceOccurrence } from '../../domain/lookups.ts';
import { type ActualResult, actualResult } from '../../domain/session.ts';
import { effectiveTiming } from '../../domain/trackingTiming.ts';
import type { WeightUnit } from '../../domain/units.ts';
import type { SequenceEntry } from '../../domain/workoutTemplate.ts';
import { Button, DialogActions, DialogTitle, PageTitle, Popover, Spinner } from '../Controls/index.ts';
import { prescriptionSummary } from '../template/prescriptionSummary.ts';
import { formatSetReference, totalCountValue, withSideCount, withTotalCount, withWeight } from './resultEditing.ts';
import './GuidedSession.css';

/** Guide a real session step while its owning page validates and persists every completed result. */
function GuidedSession(props: GuidedSessionProps): JSX.Element {
    const key = `fitnes-guided:${props.sessionId}:${props.entry.id}`;
    const restored = restoreRun(key, props.draft);
    const [started, setStarted] = createSignal(restored?.started ?? false);
    const [running, setRunning] = createSignal(restored?.anchor !== undefined);
    const [accumulated, setAccumulated] = createSignal(restored?.elapsed ?? 0);
    const [anchor, setAnchor] = createSignal<number | undefined>(restored?.anchor);
    const [now, setNow] = createSignal(Date.now());
    const [side, setSide] = createSignal<'left' | 'right'>(restored?.side ?? 'left');
    const [draft, setDraft] = createSignal<ActualResult | undefined>(restored?.draft ?? props.draft);
    const [manualSides, setManualSides] = createSignal<ManualSides>(restored?.manualSides ?? {});
    const [more, setMore] = createSignal(false);
    const [resultOpen, setResultOpen] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal('');
    const [wakeMessage, setWakeMessage] = createSignal('');
    let trigger: HTMLElement | undefined;
    let wake: WakeLockSentinel | undefined;
    let disposed = false;
    const rest = () => props.entry.restSeconds !== undefined;
    const measurement = () => props.occurrence?.set.prescription.measurement;
    const timed = () => rest() || measurement()?.measurement === 'duration';
    const perSide = () => measurement()?.countBasis === 'perSide';
    const separateSides = () => props.occurrence?.set.prescription.executionMode === 'unilateral' || perSide();
    const sideLabel = () => (side() === 'left' ? 'Left' : 'Right');
    const target = () => {
        const m = measurement();
        return props.entry.restSeconds ?? (m?.measurement === 'duration' ? m.seconds : (m?.reps ?? 1));
    };
    const timing = () => effectiveTiming(props.occurrence?.exercise.timing, props.occurrence?.set.timing);
    const prep = () => (rest() ? 0 : timing().prepSeconds);
    const counterSize = () => {
        const length = timed() ? clock(Math.ceil(target())).length : String(target()).length * 2 + 1;
        return length > 16 ? 16 : length > 10 ? 32 : 48;
    };
    const duration = () => (timed() ? target() : target() * timing().secondsPerRep);
    const elapsed = () => elapsedAt(accumulated(), anchor(), now());
    const position = createMemo(() =>
        guidedPosition(elapsed(), prep(), duration(), timed() ? undefined : timing().secondsPerRep)
    );
    const done = () => started() && position().phase === 'done';
    const name = () => (rest() ? 'Rest' : (props.occurrence?.exercise.name ?? 'Exercise'));
    const resultValue = () => {
        const m = draft()?.measurement;
        if (!m) {
            return 0;
        }
        return m.countBasis === 'perSide' ? m.sides[side()] : m.measurement === 'duration' ? m.seconds : m.reps;
    };

    function setValue(value: number): void {
        setManualSides({ ...manualSides(), [side()]: true });
        const current = draft();
        if (!current) {
            return;
        }
        setDraft(perSide() ? withSideCount(current, side(), value) : withTotalCount(current, value));
    }

    function clearStored(): void {
        try {
            localStorage.removeItem(key);
        } catch {
            /* Storage may be disabled; session results still use IndexedDB */
        }
    }

    async function keepAwake(): Promise<void> {
        if (!('wakeLock' in navigator)) {
            setWakeMessage('Keep the screen on manually.');
            return;
        }
        if (wake && !wake.released) {
            return;
        }
        try {
            const acquired = await navigator.wakeLock.request('screen');
            if (disposed || !started()) {
                await acquired.release();
                return;
            }
            wake = acquired;
            setWakeMessage('Screen stays on');
            acquired.addEventListener('release', () => setWakeMessage('Screen lock released'));
        } catch {
            setWakeMessage('Keep the screen on manually.');
        }
    }

    function start(): void {
        batch(() => {
            setNow(Date.now());
            setAnchor(Date.now());
            setStarted(true);
            setRunning(true);
        });
        void keepAwake();
    }
    function pause(): void {
        batch(() => {
            setAccumulated(elapsedAt(accumulated(), anchor(), Date.now()));
            setAnchor(undefined);
            setNow(Date.now());
            setRunning(false);
        });
    }
    function reset(): void {
        batch(() => {
            setStarted(false);
            setRunning(false);
            setAccumulated(0);
            setAnchor(undefined);
            setNow(Date.now());
        });
        void wake?.release();
    }
    function stopForEditor(): void {
        if (running()) {
            pause();
        }
    }

    async function log(skipped = false): Promise<void> {
        if (busy()) {
            return;
        }
        stopForEditor();
        if (!rest() && started() && !done() && !manualSides()[side()]) {
            setValue(skipped ? 0 : timed() ? Math.floor(Math.max(0, elapsed() / 1000 - prep())) : position().reps);
        }
        if (skipped && draft()) {
            const value = draft() as ActualResult;
            setDraft(perSide() ? withSideCount(withSideCount(value, 'left', 0), 'right', 0) : withTotalCount(value, 0));
        }
        if (!skipped && separateSides() && side() === 'left') {
            setSide('right');
            reset();
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            const saved = await props.onLog(draft());
            if (saved) {
                clearStored();
            } else {
                setMessage('Could not save. Try Log again.');
            }
        } catch {
            setMessage('Could not save. Try Log again.');
        } finally {
            setBusy(false);
        }
    }

    createEffect(() => {
        const state: SavedRun = {
            manualSides: manualSides(),
            started: started(),
            elapsed: accumulated(),
            anchor: anchor(),
            side: side(),
            draft: draft(),
        };
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            /* Continue in memory when local storage is unavailable */
        }
    });
    onMount(() => {
        const timer = window.setInterval(() => {
            if (!running()) {
                return;
            }
            setNow(Date.now());
            if (done()) {
                pause();
            }
        }, 50);
        function visible(): void {
            if (document.visibilityState === 'visible' && started()) {
                setNow(Date.now());
                void keepAwake();
            }
        }
        document.addEventListener('visibilitychange', visible);
        if (started()) {
            void keepAwake();
        }
        // Rest starts at the transition immediately following the previous persisted step.
        if (rest() && !started()) {
            start();
        }
        onCleanup(() => {
            disposed = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', visible);
            void wake?.release();
        });
    });

    return (
        <article class="live-guided" aria-label="Guided workout">
            <header class="live-guided__header">
                <PageTitle>{name()}</PageTitle>
                <Button
                    disabled={busy()}
                    onPress={(event) => {
                        trigger = event.currentTarget;
                        stopForEditor();
                        setMore(true);
                    }}
                >
                    More
                </Button>
            </header>
            <p>
                Step {props.index + 1} of {props.count}
            </p>
            <div
                class="live-guided__meter"
                role="progressbar"
                aria-label="Workout progress"
                aria-valuemin={0}
                aria-valuemax={props.count}
                aria-valuenow={props.index + 1}
                aria-valuetext={`Step ${props.index + 1} of ${props.count}`}
            >
                <For each={Array.from({ length: 16 })}>
                    {(_, i) => <span classList={{ filled: i() < (16 * (props.index + 1)) / props.count }} />}
                </For>
            </div>
            <div class="live-guided__prescription">
                <p>
                    {rest()
                        ? `${target()} seconds`
                        : props.occurrence
                          ? prescriptionSummary(props.occurrence.set.prescription, props.unit)
                          : ''}
                </p>
                <p>{rest() ? '' : `${prep()}s prep${timed() ? '' : ` · ${timing().secondsPerRep}s per rep`}`}</p>
                <p>{props.previous ? `Previous: ${formatSetReference(props.previous, props.unit)}` : ''}</p>
            </div>
            <div class="live-guided__focus">
                <div class="live-guided__status">
                    <Show when={started() || separateSides()}>
                        <p role="status">
                            {!started()
                                ? sideLabel()
                                : done()
                                  ? rest()
                                      ? 'Rest complete'
                                      : 'Set complete'
                                  : !running()
                                    ? 'Paused'
                                    : position().phase === 'prep'
                                      ? 'Get into position'
                                      : rest() || timed()
                                        ? 'Time remaining'
                                        : 'Reps completed'}
                            {started() && separateSides() ? ` · ${sideLabel()}` : ''}
                        </p>
                    </Show>
                </div>
                <div
                    class="live-guided__counter"
                    style={{ 'font-size': `${counterSize()}px` }}
                    role="timer"
                    aria-label="Set timer"
                >
                    {started() && position().phase === 'prep'
                        ? position().remaining
                        : timed()
                          ? clock(started() ? position().remaining : Math.ceil(target()))
                          : `${started() ? position().reps : 0}/${target()}`}
                </div>
                <div class="live-guided__cue">
                    <Show when={started() && !timed() && position().phase !== 'prep' && !done()}>
                        <p>
                            Next rep in{' '}
                            {Math.max(
                                1,
                                Math.ceil(
                                    timing().secondsPerRep -
                                        (Math.max(0, elapsed() / 1000 - prep()) % timing().secondsPerRep)
                                )
                            )}
                            s
                        </p>
                    </Show>
                </div>
                <div class="live-guided__control">
                    <Show when={!done()}>
                        <Button disabled={busy()} onPress={() => (running() ? pause() : start())}>
                            {!started() ? 'Start' : running() ? 'Pause' : 'Resume'}
                        </Button>
                    </Show>
                </div>
                <div class="live-guided__log">
                    <div class="live-guided__result">
                        <Show when={done() && !rest()}>
                            <ResultNumberField
                                label={perSide() ? `Actual ${side()}` : timed() ? 'Actual seconds' : 'Actual reps'}
                                value={resultValue()}
                                integer={!timed()}
                                disabled={busy()}
                                onChange={setValue}
                            />
                        </Show>
                    </div>
                    <Button disabled={busy()} onPress={() => void log()}>
                        {busy()
                            ? 'Saving'
                            : rest()
                              ? 'Next'
                              : separateSides() && side() === 'left'
                                ? 'Next side'
                                : 'Log'}
                    </Button>
                </div>
            </div>
            <div class="live-guided__bottom">
                <p>Next: {props.nextName ?? 'Finish workout'}</p>
                <div class="button-row">
                    <Button disabled={busy()} onPress={() => void log(true)}>
                        Skip
                    </Button>
                    <Show when={started() && !running() && !done()}>
                        <Button disabled={busy()} onPress={reset}>
                            Reset
                        </Button>
                    </Show>
                </div>
                <p class="live-guided__feedback" role="status">
                    {message() || wakeMessage()}
                </p>
            </div>
            <Popover
                open={more()}
                onOpenChange={setMore}
                label="Workout actions"
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
                width={160}
            >
                <div class="action-menu">
                    <Button
                        onPress={() => {
                            setMore(false);
                            props.onReview(draft());
                        }}
                    >
                        Review
                    </Button>
                    <Show when={!rest()}>
                        <Button
                            onPress={() => {
                                setMore(false);
                                setResultOpen(true);
                            }}
                        >
                            Result
                        </Button>
                    </Show>
                    <Button
                        onPress={() => {
                            setMore(false);
                            props.onComplete(trigger);
                        }}
                    >
                        Complete
                    </Button>
                    <Button
                        onPress={() => {
                            setMore(false);
                            props.onDelete(trigger);
                        }}
                    >
                        Delete
                    </Button>
                    <DialogActions kind="end" onConfirm={() => setMore(false)} />
                </div>
            </Popover>
            <Popover
                open={resultOpen()}
                onOpenChange={setResultOpen}
                label="Edit result"
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <DialogTitle>Result</DialogTitle>
                    <Show when={draft()}>
                        {(value) => (
                            <>
                                <Show
                                    when={value().measurement.countBasis === 'perSide'}
                                    fallback={
                                        <ResultNumberField
                                            label={timed() ? 'Actual seconds' : 'Actual reps'}
                                            value={totalCountValue(value().measurement) ?? 0}
                                            integer={!timed()}
                                            onChange={(count) => {
                                                setManualSides({ ...manualSides(), [side()]: true });
                                                setDraft(withTotalCount(value(), count));
                                            }}
                                        />
                                    }
                                >
                                    <For each={['left', 'right'] as const}>
                                        {(s) => (
                                            <ResultNumberField
                                                label={`Actual ${s}`}
                                                value={
                                                    value().measurement.countBasis === 'perSide'
                                                        ? (
                                                              value().measurement as {
                                                                  sides: { left: number; right: number };
                                                              }
                                                          ).sides[s]
                                                        : 0
                                                }
                                                integer={!timed()}
                                                onChange={(count) => {
                                                    setManualSides({ ...manualSides(), [s]: true });
                                                    setDraft(withSideCount(value(), s, count));
                                                }}
                                            />
                                        )}
                                    </For>
                                </Show>
                                <Show
                                    when={
                                        value().load.kind === 'external' || value().load.kind === 'bodyweightExternal'
                                    }
                                >
                                    <ResultNumberField
                                        label={addedWeightLabel(props.unit)}
                                        signed
                                        value={
                                            value().load.kind === 'external' ||
                                            value().load.kind === 'bodyweightExternal'
                                                ? massValue(
                                                      (value().load as { weight: { value: number; unit: WeightUnit } })
                                                          .weight,
                                                      props.unit
                                                  )
                                                : 0
                                        }
                                        onChange={(weight) => setDraft(withWeight(value(), weight, props.unit))}
                                    />
                                </Show>
                                <p>
                                    {value().load.kind === 'bodyweight'
                                        ? 'Bodyweight'
                                        : value().load.kind === 'bodyweightExternal'
                                          ? 'Bodyweight plus external load'
                                          : ''}
                                </p>
                            </>
                        )}
                    </Show>
                    <DialogActions kind="end" onConfirm={() => setResultOpen(false)} />
                </div>
            </Popover>
        </article>
    );
}

interface GuidedSessionProps {
    sessionId: string;
    entry: SequenceEntry;
    occurrence?: SequenceOccurrence;
    draft?: ActualResult;
    previous?: ActualResult;
    index: number;
    count: number;
    nextName?: string;
    unit: WeightUnit;
    onLog: (draft: ActualResult | undefined) => Promise<boolean>;
    onReview: (draft: ActualResult | undefined) => void;
    onComplete: (trigger?: HTMLElement) => void;
    onDelete: (trigger?: HTMLElement) => void;
}
interface SavedRun {
    started: boolean;
    manualSides?: ManualSides;
    elapsed: number;
    anchor?: number;
    side: 'left' | 'right';
    draft?: ActualResult;
}
type ManualSides = Partial<Record<'left' | 'right', boolean>>;

/** Ignore corrupt/stale local timer state; real performance remains validated in IndexedDB. */
function restoreRun(key: string, planned: ActualResult | undefined): SavedRun | undefined {
    try {
        const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (
            !raw ||
            typeof raw.started !== 'boolean' ||
            !Number.isFinite(raw.elapsed) ||
            raw.elapsed < 0 ||
            (raw.anchor !== undefined && (!Number.isFinite(raw.anchor) || raw.anchor < 0)) ||
            !['left', 'right'].includes(raw.side)
        ) {
            return undefined;
        }
        const manualSides = raw.manualSides;
        if (
            manualSides !== undefined &&
            (manualSides === null ||
                typeof manualSides !== 'object' ||
                Object.entries(manualSides).some(
                    ([side, manual]) => !['left', 'right'].includes(side) || typeof manual !== 'boolean'
                ))
        ) {
            return undefined;
        }
        // Older caches tracked only the current side's correction.
        raw.manualSides = manualSides ?? (raw.manual === true ? { [raw.side]: true } : {});
        if (planned) {
            const result = actualResult(raw.draft);
            if (
                result instanceof type.errors ||
                result.sequenceEntryId !== planned.sequenceEntryId ||
                result.measurement.measurement !== planned.measurement.measurement ||
                result.measurement.countBasis !== planned.measurement.countBasis ||
                result.load.kind !== planned.load.kind
            ) {
                return undefined;
            }
            raw.draft = result;
        }
        return raw as SavedRun;
    } catch {
        return undefined;
    }
}

/** Update a paused guided draft from Review without discarding its timer or side. */
function updateGuidedDraft(sessionId: string, draft: ActualResult, previous: ActualResult | undefined): void {
    const key = `fitnes-guided:${sessionId}:${draft.sequenceEntryId}`;
    const saved = restoreRun(key, draft);
    const before = saved?.draft ?? previous;
    const manualSides = { ...saved?.manualSides };
    for (const side of ['left', 'right'] as const) {
        const old = before?.measurement;
        const next = draft.measurement;
        const oldCount = old?.countBasis === 'perSide' ? old.sides[side] : old && totalCountValue(old);
        const nextCount = next.countBasis === 'perSide' ? next.sides[side] : totalCountValue(next);
        if (oldCount !== nextCount) {
            manualSides[side] = true;
        }
    }
    try {
        localStorage.setItem(
            key,
            JSON.stringify({ started: false, elapsed: 0, side: 'left', ...saved, manualSides, draft })
        );
    } catch {
        /* Review's in-memory draft remains available when local storage is disabled */
    }
}
/** Keep large imported results loggable even beyond the shared five-digit keypad capacity. */
function ResultNumberField(props: ResultNumberFieldProps): JSX.Element {
    const digits = () => Math.max(3, String(Math.floor(Math.abs(props.value))).length);
    const fraction = () => (props.integer ? 0 : Math.max(0, Math.min(2, 5 - digits())));
    const representable = () => digits() <= 5 && props.value <= 10 ** digits() - 10 ** -fraction();
    return (
        <Show
            when={representable()}
            fallback={
                <p>
                    {props.label}: {props.value}
                </p>
            }
        >
            <Spinner
                label={props.label}
                value={props.value}
                min={props.signed ? -(10 ** digits() - 10 ** -fraction()) : 0}
                integerDigits={digits()}
                fractionDigits={fraction()}
                step={props.integer || fraction() === 0 ? 1 : fraction() === 1 ? 0.1 : 0.25}
                disabled={props.disabled}
                onChange={props.onChange}
                popoverMount={document.getElementById('root') ?? undefined}
            />
        </Show>
    );
}
interface ResultNumberFieldProps {
    signed?: boolean;
    label: string;
    value: number;
    integer?: boolean;
    disabled?: boolean;
    onChange: (value: number) => void;
}

function clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export { GuidedSession, updateGuidedDraft };
