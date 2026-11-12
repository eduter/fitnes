import { A, useParams } from '@solidjs/router';
import { createMemo, createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { DraftGuard } from '../app/DraftGuard.tsx';
import { Button, ConfirmDialog } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { GuidedSession, updateGuidedDraft } from '../components/session/GuidedSession.tsx';
import { previousPerformance } from '../components/session/previousPerformance.ts';
import { SessionSet } from '../components/session/SessionSet.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { formatMass } from '../domain/convertWeight.ts';
import type { SequenceEntryId } from '../domain/ids.ts';
import { findOccurrence } from '../domain/lookups.ts';
import {
    clearResult,
    completeSession,
    draftResultFromPrescription,
    recordRest,
    recordResult,
    reopenSession,
} from '../domain/recordSession.ts';
import type { ActualResult, WorkoutSession } from '../domain/session.ts';
import { validateWorkoutSession } from '../domain/validateWorkoutSession.ts';
import type { ValidationIssue, ValidationResult } from '../domain/validation.ts';
import type { SequenceEntry } from '../domain/workoutTemplate.ts';
import { withExecutionTiming } from '../domain/workoutTiming.ts';
import { useAppNavigate } from '../routing/navigation.ts';
import { formatDateTime } from '../utils/datetime.ts';

/** Log results against a session snapshot, or review a completed session. */
function SessionPage(): JSX.Element {
    const params = useParams();
    const nav = useAppNavigate();
    const app = useAppData();
    const session = (): WorkoutSession | undefined => app.sessions().find((candidate) => candidate.id === params.id);

    const [drafts, setDrafts] = createSignal<Record<string, ActualResult>>({});
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const defaults = createMemo(() => defaultDrafts(session()));
    const previous = createMemo(() => {
        const current = session();
        return current ? previousPerformance(current, app.sessions()) : {};
    });
    const occurrences = createMemo(() => {
        const current = session();
        return current
            ? current.snapshot.sequence.flatMap((entry) => {
                  const occurrence = findOccurrence(current.snapshot, entry.id);
                  return occurrence ? [occurrence] : [];
              })
            : [];
    });
    const [confirming, setConfirming] = createSignal<'delete' | 'complete'>();
    const [busy, setBusy] = createSignal(false);
    const [reviewing, setReviewing] = createSignal(false);
    const activeEntry = createMemo(() =>
        session()?.snapshot.sequence.find((entry) =>
            entry.restSeconds !== undefined
                ? !session()?.completedRestIds?.includes(entry.id)
                : !session()?.results.some((result) => result.sequenceEntryId === entry.id)
        )
    );
    let trigger: HTMLElement | undefined;
    const loggedCount = createMemo(() => (session()?.results.length ?? 0) + (session()?.completedRestIds?.length ?? 0));
    const plannedCount = createMemo(() => session()?.snapshot.sequence.length ?? 0);
    const effectiveDrafts = createMemo<Record<string, ActualResult>>(() => {
        const current = session();
        if (!current) {
            return {};
        }

        const next: Record<string, ActualResult> = {};
        for (const entry of current.snapshot.sequence) {
            const draft =
                drafts()[entry.id] ??
                current.results.find((result) => result.sequenceEntryId === entry.id) ??
                defaults()[entry.id];
            if (draft) {
                next[entry.id] = draft;
            }
        }
        return next;
    });

    const readOnly = createMemo(() => session()?.completedAt !== undefined);

    // Evaluate each mutation against the refreshed session, so rapid presses cannot overwrite another set
    let pending = Promise.resolve();
    function change(transform: (current: WorkoutSession) => ValidationResult<WorkoutSession>): Promise<void> {
        const job = pending.then(async () => {
            const current = session();
            if (!current) {
                return;
            }
            const result = transform(current);
            if (!result.ok) {
                setErrors(result.errors);
                return;
            }
            const saved = await app.saveSession(result.value);
            setErrors(saved.ok ? [] : saved.errors);
        });
        pending = job.catch((cause: unknown) => {
            setErrors([{ path: '', message: cause instanceof Error ? cause.message : 'Could not save workout.' }]);
        });
        return pending;
    }

    function log(entryId: SequenceEntryId): Promise<void> {
        const draft = effectiveDrafts()[entryId];
        if (!draft) {
            return Promise.resolve();
        }
        return change((current) => recordResult(current, { ...draft, completedAt: Date.now() }));
    }

    function edit(draft: ActualResult): Promise<void> {
        return change((current) => recordResult(current, { ...draft, completedAt: Date.now() }));
    }

    async function clear(entryId: SequenceEntryId): Promise<void> {
        const key = `fitnes-guided:${params.id}:${entryId}`;
        let cached: string | null = null;
        const draft = drafts()[entryId];
        await change((current) => {
            // Refreshed data mounts the reopened step immediately, so clear its draft first
            try {
                cached = localStorage.getItem(key);
                localStorage.removeItem(key);
            } catch {
                /* Session persistence still works when transient storage is unavailable */
            }
            const next = { ...drafts() };
            delete next[entryId];
            setDrafts(next);
            return clearResult(current, entryId);
        });
        const value = session();
        if (
            value?.results.some((result) => result.sequenceEntryId === entryId) ||
            value?.completedRestIds?.includes(entryId)
        ) {
            if (draft) {
                setDrafts({ ...drafts(), [entryId]: draft });
            }
            try {
                if (cached !== null) {
                    localStorage.setItem(key, cached);
                }
            } catch {
                /* Failed saves retain their persisted result even without the timer cache */
            }
        }
    }

    async function previousStep(): Promise<void> {
        if (busy()) {
            return;
        }
        const current = session();
        if (!current || current.completedAt !== undefined) {
            return;
        }
        const index = activeEntry()
            ? current.snapshot.sequence.findIndex((entry) => entry.id === activeEntry()?.id)
            : current.snapshot.sequence.length;
        const previous = current.snapshot.sequence[index - 1];
        if (!previous) {
            return;
        }
        setBusy(true);
        await clear(previous.id);
        setBusy(false);
    }

    async function complete(): Promise<void> {
        setBusy(true);
        await change((current) =>
            completeSession(
                current,
                Math.max(Date.now(), current.startedAt, ...current.results.map((result) => result.completedAt))
            )
        );
        if (session()?.completedAt !== undefined) {
            try {
                const prefix = `fitnes-guided:${session()?.id}:`;
                for (const key of Object.keys(localStorage)) {
                    if (key.startsWith(prefix)) {
                        localStorage.removeItem(key);
                    }
                }
            } catch {
                /* Completed history remains in IndexedDB even when timer cache cleanup is unavailable */
            }
        }
        setBusy(false);
    }

    function reopen(): Promise<void> {
        return change((current) => {
            const reopened = reopenSession(current);
            if (!reopened.ok) {
                return reopened;
            }
            return validateWorkoutSession({
                ...reopened.value,
                snapshot: withExecutionTiming(
                    current.snapshot,
                    app.templates().find((plan) => plan.id === current.templateId),
                    app.exercises()
                ),
            });
        });
    }

    async function remove(): Promise<void> {
        setBusy(true);
        await pending;
        const current = session();
        if (current && (await app.removeSession(current.id))) {
            setDrafts({});
            nav.toHistoryList();
        }
        setBusy(false);
    }

    return (
        <section class="page" classList={{ 'page--tracking': !readOnly() && !reviewing() && !!activeEntry() }}>
            <DraftGuard
                dirty={Object.keys(drafts()).some(
                    (id) =>
                        !session()?.results.some((result) => result.sequenceEntryId === id) &&
                        JSON.stringify(drafts()[id]) !== JSON.stringify(defaults()[id])
                )}
            />
            <ConfirmDialog
                open={confirming() !== undefined}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirming(undefined);
                    }
                }}
                message={
                    confirming() === 'delete'
                        ? `Delete ${session()?.snapshot.name ?? 'session'}?`
                        : `Finish with ${loggedCount()}/${plannedCount()} steps logged?`
                }
                onConfirm={() => {
                    if (confirming() === 'delete') {
                        void remove();
                    } else {
                        void complete();
                    }
                }}
                trigger={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            />
            <Show
                when={session()}
                fallback={
                    <p class="muted">
                        Session not found. <A href="/sessions">Back to history</A>
                    </p>
                }
            >
                {(current) => (
                    <>
                        <Show
                            when={!readOnly() && !reviewing() ? activeEntry()?.id : undefined}
                            keyed
                            fallback={
                                <>
                                    <PageHeader
                                        title={current().snapshot.name}
                                        actions={
                                            <div class="button-row">
                                                <Show when={!readOnly() && !activeEntry() && plannedCount() > 0}>
                                                    <Button disabled={busy()} onPress={() => void previousStep()}>
                                                        Previous
                                                    </Button>
                                                </Show>
                                                <Show when={!readOnly() && activeEntry()}>
                                                    <Button onPress={() => setReviewing(false)}>Track</Button>
                                                </Show>
                                                <Show
                                                    when={current().completedAt === undefined}
                                                    fallback={
                                                        <Button type="button" onPress={() => void reopen()}>
                                                            Reopen
                                                        </Button>
                                                    }
                                                >
                                                    <Button
                                                        type="button"
                                                        disabled={busy()}
                                                        onPress={(event) => {
                                                            trigger = event.currentTarget;
                                                            if (loggedCount() < plannedCount()) {
                                                                setConfirming('complete');
                                                            } else {
                                                                void complete();
                                                            }
                                                        }}
                                                    >
                                                        Complete
                                                    </Button>
                                                </Show>
                                                <Button
                                                    type="button"
                                                    disabled={busy()}
                                                    onPress={(event) => {
                                                        trigger = event.currentTarget;
                                                        setConfirming('delete');
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        }
                                    />
                                    <p class="muted session-meta">
                                        {formatDateTime(current().startedAt)}
                                        <Show when={current().completedAt}>
                                            {(completedAt) => <> → {formatDateTime(completedAt())}</>}
                                        </Show>
                                        <Show when={current().bodyweight}>
                                            {(bodyweight) => <> · BW {formatMass(bodyweight(), app.massUnit(), 1)}</>}
                                        </Show>
                                    </p>
                                    <ValidationErrors errors={errors()} />
                                    <div class="session-progress" role="status">
                                        <span>
                                            {loggedCount()}/{plannedCount()} steps logged
                                        </span>
                                        <div class="session-progress__track">
                                            <div
                                                class="session-progress__bar"
                                                style={{ width: `${progressPercent(loggedCount(), plannedCount())}%` }}
                                            />
                                        </div>
                                    </div>
                                    <Show when={readOnly()}>
                                        <p role="status">
                                            Workout complete · {loggedCount()}/{plannedCount()} steps recorded.
                                        </p>
                                    </Show>
                                    <PagedList
                                        label={`Workout ${current().id}`}
                                        items={current().snapshot.sequence.map((entry) => entry.id)}
                                        rowHeight={96}
                                        empty="This workout has no sets."
                                    >
                                        {(id) => (
                                            <Show
                                                when={occurrences().find((item) => item.entry.id === id)}
                                                fallback={
                                                    <article>
                                                        <p>
                                                            Rest{' '}
                                                            {
                                                                current().snapshot.sequence.find(
                                                                    (entry) => entry.id === id
                                                                )?.restSeconds
                                                            }
                                                            s
                                                        </p>
                                                        <p>
                                                            {current().completedRestIds?.includes(id)
                                                                ? 'Done'
                                                                : 'Not completed'}
                                                        </p>
                                                        <Show
                                                            when={
                                                                !readOnly() && current().completedRestIds?.includes(id)
                                                            }
                                                        >
                                                            <Button onPress={() => void clear(id)}>Clear rest</Button>
                                                        </Show>
                                                    </article>
                                                }
                                            >
                                                {(occurrence) => (
                                                    <SessionSet
                                                        occurrence={occurrence()}
                                                        index={current().snapshot.sequence.findIndex(
                                                            (entry) => entry.id === id
                                                        )}
                                                        previous={previous()[id]}
                                                        draft={effectiveDrafts()[id]}
                                                        recorded={current().results.some(
                                                            (result) => result.sequenceEntryId === id
                                                        )}
                                                        readOnly={readOnly() || busy()}
                                                        onDraftChange={(draft) => {
                                                            updateGuidedDraft(
                                                                current().id,
                                                                draft,
                                                                effectiveDrafts()[id]
                                                            );
                                                            setDrafts({ ...drafts(), [id]: draft });
                                                            if (
                                                                current().results.some(
                                                                    (result) => result.sequenceEntryId === id
                                                                )
                                                            ) {
                                                                void edit(draft);
                                                            }
                                                        }}
                                                        onLog={() => void log(id)}
                                                        onClear={() => void clear(id)}
                                                    />
                                                )}
                                            </Show>
                                        )}
                                    </PagedList>
                                </>
                            }
                        >
                            {(id) => (
                                <>
                                    <ValidationErrors errors={errors()} />
                                    <GuidedSession
                                        sessionId={current().id}
                                        entry={requireEntry(current(), id)}
                                        occurrence={findOccurrence(current().snapshot, id)}
                                        draft={effectiveDrafts()[id]}
                                        previous={previous()[id]}
                                        index={current().snapshot.sequence.findIndex((entry) => entry.id === id)}
                                        count={plannedCount()}
                                        unit={app.massUnit()}
                                        nextName={(() => {
                                            const index = current().snapshot.sequence.findIndex(
                                                (entry) => entry.id === id
                                            );
                                            const next = current().snapshot.sequence[index + 1];
                                            return next?.restSeconds !== undefined
                                                ? `Rest ${next.restSeconds}s`
                                                : next
                                                  ? findOccurrence(current().snapshot, next.id)?.exercise.name
                                                  : undefined;
                                        })()}
                                        onLog={async (draft) => {
                                            const entry = current().snapshot.sequence.find((entry) => entry.id === id);
                                            if (entry?.restSeconds !== undefined) {
                                                await change((value) => recordRest(value, id));
                                                return session()?.completedRestIds?.includes(id) ?? false;
                                            }
                                            if (!draft) {
                                                return false;
                                            }
                                            await change((value) =>
                                                recordResult(value, {
                                                    ...draft,
                                                    completedAt: Math.max(Date.now(), value.startedAt),
                                                })
                                            );
                                            return (
                                                session()?.results.some((result) => result.sequenceEntryId === id) ??
                                                false
                                            );
                                        }}
                                        onPrevious={
                                            current().snapshot.sequence[0]?.id !== id ? previousStep : undefined
                                        }
                                        onReview={(draft) => {
                                            if (draft) {
                                                setDrafts({ ...drafts(), [id]: draft });
                                            }
                                            setReviewing(true);
                                        }}
                                        onComplete={(element) => {
                                            trigger = element;
                                            if (loggedCount() < plannedCount()) {
                                                setConfirming('complete');
                                            } else {
                                                void complete();
                                            }
                                        }}
                                        onDelete={(element) => {
                                            trigger = element;
                                            setConfirming('delete');
                                        }}
                                    />
                                </>
                            )}
                        </Show>
                    </>
                )}
            </Show>
        </section>
    );
}

/** Progress as a whole-number percentage; an empty plan reports nothing logged. */
function progressPercent(logged: number, planned: number): number {
    if (planned === 0) {
        return 0;
    }

    return Math.round((logged / planned) * 100);
}

function defaultDrafts(current: WorkoutSession | undefined): Record<string, ActualResult> {
    if (!current) {
        return {};
    }

    const next: Record<string, ActualResult> = {};
    for (const entry of current.snapshot.sequence) {
        const occurrence = findOccurrence(current.snapshot, entry.id);
        if (!occurrence) {
            continue;
        }
        next[entry.id] = draftResultFromPrescription(entry.id, occurrence.set.prescription, current.startedAt);
    }
    return next;
}

function requireEntry(session: WorkoutSession, id: SequenceEntryId): SequenceEntry {
    const entry = session.snapshot.sequence.find((candidate) => candidate.id === id);
    if (!entry) {
        throw new Error(`Session '${session.id}' has no step '${id}'`);
    }
    return entry;
}

export { SessionPage };
