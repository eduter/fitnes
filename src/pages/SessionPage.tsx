import { Button, ConfirmDialog } from '../components/Controls/index.ts';
import { PagedList } from '../components/PagedList.tsx';
import { A, useNavigate, useParams } from '@solidjs/router';
import { Show, createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { SessionSet } from '../components/session/SessionSet.tsx';
import { previousPerformance } from '../components/session/previousPerformance.ts';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { formatMass } from '../domain/convertWeight.ts';
import type { SequenceEntryId } from '../domain/ids.ts';
import { findOccurrence } from '../domain/lookups.ts';
import {
    clearResult,
    completeSession,
    draftResultFromPrescription,
    recordResult,
    reopenSession,
} from '../domain/recordSession.ts';
import type { ActualResult, WorkoutSession } from '../domain/session.ts';
import { DraftGuard } from '../app/DraftGuard.tsx';
import type { ValidationResult, ValidationIssue } from '../domain/validation.ts';
import { formatDateTime } from '../utils/datetime.ts';

/** Log results against a session snapshot, or review a completed session. */
function SessionPage(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
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
    let trigger: HTMLElement | undefined;
    const loggedCount = createMemo(() => session()?.results.length ?? 0);
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

    function clear(entryId: SequenceEntryId): Promise<void> {
        const next = { ...drafts() };
        delete next[entryId];
        setDrafts(next);
        return change((current) => clearResult(current, entryId));
    }

    async function complete(): Promise<void> {
        setBusy(true);
        await change((current) =>
            completeSession(
                current,
                Math.max(Date.now(), current.startedAt, ...current.results.map((result) => result.completedAt))
            )
        );
        setBusy(false);
    }

    function reopen(): Promise<void> {
        return change(reopenSession);
    }

    async function remove(): Promise<void> {
        setBusy(true);
        await pending;
        const current = session();
        if (current && (await app.removeSession(current.id))) {
            setDrafts({});
            navigate('/sessions');
        }
        setBusy(false);
    }

    return (
        <section class="page">
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
                        : `Finish with ${loggedCount()}/${plannedCount()} sets logged?`
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
                        <PageHeader
                            title={current().snapshot.name}
                            actions={
                                <div class="button-row">
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
                                {loggedCount()}/{plannedCount()} sets logged
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
                                Workout complete · {loggedCount()}/{plannedCount()} sets recorded.
                            </p>
                        </Show>
                        <PagedList
                            label={`Workout ${current().id}`}
                            items={occurrences().map((occurrence) => occurrence.entry.id)}
                            rowHeight={96}
                            empty="This workout has no sets."
                        >
                            {(id) => (
                                <Show when={occurrences().find((item) => item.entry.id === id)}>
                                    {(occurrence) => (
                                        <SessionSet
                                            occurrence={occurrence()}
                                            index={current().snapshot.sequence.findIndex((entry) => entry.id === id)}
                                            previous={previous()[id]}
                                            draft={effectiveDrafts()[id]}
                                            recorded={current().results.some((result) => result.sequenceEntryId === id)}
                                            readOnly={readOnly() || busy()}
                                            onDraftChange={(draft) => {
                                                setDrafts({ ...drafts(), [id]: draft });
                                                if (current().results.some((result) => result.sequenceEntryId === id)) {
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

export { SessionPage };
