import { A, useNavigate, useParams } from '@solidjs/router';
import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';
import { useAppData } from '../app/AppData.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { RawDocument } from '../components/RawDocument.tsx';
import { OccurrenceCard } from '../components/session/OccurrenceCard.tsx';
import { ValidationErrors } from '../components/ValidationErrors.tsx';
import { formatWeight } from '../domain/format.ts';
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
                        <p class="muted">
                            started {formatDateTime(current().startedAt)}
                            <Show when={current().completedAt}>
                                {(completedAt) => <> · completed {formatDateTime(completedAt())}</>}
                            </Show>
                            <Show when={current().bodyweight}>
                                {(bodyweight) => (
                                    <>
                                        {' '}
                                        · bodyweight {formatWeight(bodyweight())}
                                        {bodyweight().source
                                            ? ` from ${formatDateTime(bodyweight().source?.measuredAt ?? 0)}`
                                            : ' (no history source)'}
                                    </>
                                )}
                            </Show>
                            <Show when={!current().bodyweight}> · no bodyweight snapshot</Show>
                        </p>
                        <p class="muted">
                            {current().results.length}/{current().snapshot.sequence.length} logged. Execution mode lives
                            on the prescription, not the result. A per-side set logs each side separately.
                        </p>
                        <ValidationErrors errors={errors()} />
                        <ol class="sequence-list">
                            <For each={current().snapshot.sequence}>
                                {(entry) => {
                                    const occurrence = findOccurrence(current().snapshot, entry.id);
                                    if (!occurrence) {
                                        return <li class="card">Unknown sequence entry {entry.id}</li>;
                                    }

                                    const result = current().results.find(
                                        (candidate) => candidate.sequenceEntryId === entry.id
                                    );
                                    const draft = drafts()[entry.id] ?? result ?? defaults()[entry.id];
                                    if (!draft) {
                                        return <li class="card">Unknown sequence entry {entry.id}</li>;
                                    }

                                    return (
                                        <li>
                                            <OccurrenceCard
                                                session={current()}
                                                occurrence={occurrence}
                                                result={result}
                                                draft={draft}
                                                readOnly={readOnly()}
                                                onDraftChange={(next) => setDrafts({ ...drafts(), [entry.id]: next })}
                                                onLog={() => void log(entry.id)}
                                                onEdit={(next) => void edit(next)}
                                                onClear={() => void clear(entry.id)}
                                            />
                                        </li>
                                    );
                                }}
                            </For>
                        </ol>
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
