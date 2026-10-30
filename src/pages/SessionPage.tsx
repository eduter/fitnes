import { A, useNavigate, useParams } from '@solidjs/router';
import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { CurrentSetPanel } from '../components/session/CurrentSetPanel.tsx';
import { currentSet } from '../components/session/currentSet.ts';
import { ExerciseBlock } from '../components/session/ExerciseBlock.tsx';
import { previousPerformance } from '../components/session/previousPerformance.ts';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { formatWeight } from '../domain/format.ts';
import type { SequenceEntryId } from '../domain/ids.ts';
import { findOccurrence, groupSequenceEntries } from '../domain/lookups.ts';
import {
    clearResult,
    completeSession,
    draftResultFromPrescription,
    recordResult,
    reopenSession,
} from '../domain/recordSession.ts';
import type { ActualResult, WorkoutSession } from '../domain/session.ts';
import type { ValidationIssue } from '../domain/validation.ts';
import { formatDateTime } from '../utils/datetime.ts';

/** Log results against a session snapshot, or review a completed session. */
function SessionPage(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();
    const app = useAppData();
    const session = (): WorkoutSession | undefined => app.sessions().find((candidate) => candidate.id === params.id);

    const [busy, setBusy] = createSignal(false);
    const active = createMemo(() => {
        const value = session();
        return value ? currentSet(value) : undefined;
    });
    const [drafts, setDrafts] = createSignal<Record<string, ActualResult>>({});
    const [errors, setErrors] = createSignal<ValidationIssue[]>([]);
    const defaults = createMemo(() => defaultDrafts(session()));
    const previous = createMemo(() => {
        const current = session();
        return current ? previousPerformance(current, app.sessions()) : {};
    });
    const blocks = createMemo(() => {
        const current = session();
        return current ? groupSequenceEntries(current.snapshot) : [];
    });
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

    async function persist(next: WorkoutSession): Promise<boolean> {
        const result = await app.saveSession(next);
        setErrors(result.ok ? [] : result.errors);
        return result.ok;
    }

    async function log(entryId: SequenceEntryId): Promise<void> {
        if (busy()) {
            return;
        }
        const current = session();
        const draft = drafts()[entryId] ?? effectiveDrafts()[entryId];
        if (!current || !draft) {
            return;
        }

        const recorded = recordResult(current, { ...draft, completedAt: Date.now() });
        if (!recorded.ok) {
            setErrors(recorded.errors);
            return;
        }
        setBusy(true);
        try {
            await persist(recorded.value);
        } finally {
            setBusy(false);
        }
    }

    async function edit(draft: ActualResult): Promise<void> {
        const current = session();
        if (!current) {
            return;
        }

        const recorded = recordResult(current, { ...draft, completedAt: Date.now() });
        if (!recorded.ok) {
            setErrors(recorded.errors);
            return;
        }
        await persist(recorded.value);
    }

    async function clear(entryId: SequenceEntryId): Promise<void> {
        const current = session();
        if (!current) {
            return;
        }

        const cleared = clearResult(current, entryId);
        if (!cleared.ok) {
            setErrors(cleared.errors);
            return;
        }
        await persist(cleared.value);
    }

    async function complete(): Promise<void> {
        const current = session();
        if (!current) {
            return;
        }

        if (
            current.results.length < current.snapshot.sequence.length &&
            !confirm(`Finish with ${current.snapshot.sequence.length - current.results.length} unlogged sets?`)
        ) {
            return;
        }
        const timestamps = current.results.map((result) => result.completedAt);
        const completedAt = Math.max(Date.now(), ...timestamps, current.startedAt);
        const completed = completeSession(current, completedAt);
        if (!completed.ok) {
            setErrors(completed.errors);
            return;
        }
        await persist(completed.value);
    }

    async function reopen(): Promise<void> {
        const current = session();
        if (!current) {
            return;
        }

        const reopened = reopenSession(current);
        if (!reopened.ok) {
            setErrors(reopened.errors);
            return;
        }
        await persist(reopened.value);
    }

    async function remove(): Promise<void> {
        const current = session();
        if (!current || !confirm('Delete this session?')) {
            return;
        }
        await app.removeSession(current.id);
        navigate('/sessions');
    }

    return (
        <section class="page">
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
                                            <button
                                                class="btn btn--secondary"
                                                type="button"
                                                onClick={() => void reopen()}
                                            >
                                                Reopen
                                            </button>
                                        }
                                    >
                                        <button class="btn btn--primary" type="button" onClick={() => void complete()}>
                                            Finish
                                        </button>
                                    </Show>
                                    <button class="btn btn--secondary" type="button" onClick={() => void remove()}>
                                        Delete
                                    </button>
                                </div>
                            }
                        />
                        <p class="muted session-meta">
                            {formatDateTime(current().startedAt)}
                            <Show when={current().completedAt}>
                                {(completedAt) => <> → {formatDateTime(completedAt())}</>}
                            </Show>
                            <Show when={current().bodyweight}>
                                {(bodyweight) => <> · BW {formatWeight(bodyweight())}</>}
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
                        <Show when={!readOnly()}>
                            <Show
                                when={active()}
                                fallback={
                                    <div class="stack">
                                        <h2 class="section-title">All sets logged</h2>
                                        <p>Finish the workout when you are ready.</p>
                                    </div>
                                }
                            >
                                {(focused) => (
                                    <Show when={effectiveDrafts()[focused().occurrence.entry.id]}>
                                        {(draft) => (
                                            <CurrentSetPanel
                                                current={focused()}
                                                draft={draft()}
                                                previous={previous()[focused().occurrence.entry.id]}
                                                busy={busy()}
                                                onChange={(next) =>
                                                    setDrafts({ ...drafts(), [focused().occurrence.entry.id]: next })
                                                }
                                                onLog={() => void log(focused().occurrence.entry.id)}
                                            />
                                        )}
                                    </Show>
                                )}
                            </Show>
                        </Show>
                        <details open={readOnly()} class="session-overview">
                            <summary>{readOnly() ? 'Recorded sets' : 'All sets / edit results'}</summary>
                            <div class="stack">
                                <For each={blocks()}>
                                    {(occurrences) => (
                                        <ExerciseBlock
                                            occurrences={occurrences}
                                            session={current()}
                                            previous={previous()}
                                            drafts={effectiveDrafts()}
                                            readOnly={readOnly()}
                                            onDraftChange={(entryId, draft) => {
                                                setDrafts({ ...drafts(), [entryId]: draft });
                                                const existing = current().results.find(
                                                    (candidate) => candidate.sequenceEntryId === entryId
                                                );
                                                if (existing) {
                                                    void edit(draft);
                                                }
                                            }}
                                            onLog={(entryId) => void log(entryId)}
                                            onClear={(entryId) => void clear(entryId)}
                                        />
                                    )}
                                </For>
                            </div>
                        </details>
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
