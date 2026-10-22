import { A, useNavigate, useParams } from '@solidjs/router';
import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
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
        const current = session();
        const draft = drafts()[entryId] ?? defaults()[entryId];
        if (!current || !draft) {
            return;
        }

        const recorded = recordResult(current, { ...draft, completedAt: Date.now() });
        if (!recorded.ok) {
            setErrors(recorded.errors);
            return;
        }
        await persist(recorded.value);
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
                                            Complete
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
                        <p class="muted session-meta">
                            {loggedCount()}/{plannedCount()} sets logged
                        </p>
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
                        <RawDocument value={current()} />
                    </>
                )}
            </Show>
        </section>
    );
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
