import { Button } from '../Button/Button.tsx';
import { For, Show, type JSX } from 'solid-js';
import { formatMeasurement } from '../../domain/format.ts';
import type { SequenceEntryId } from '../../domain/ids.ts';
import type { SequenceOccurrence } from '../../domain/lookups.ts';
import type { ActualResult, WorkoutSession } from '../../domain/session.ts';
import { CompactNumberField } from '../fields.tsx';
import {
    externalWeightValue,
    formatSetReference,
    resultCells,
    sideCountValues,
    summarizeTargets,
    totalCountValue,
    withSideCount,
    withTotalCount,
    withWeight,
} from './resultEditing.ts';

interface ExerciseBlockProps {
    /** Consecutive occurrences of one exercise, in execution order. */
    occurrences: SequenceOccurrence[];
    session: WorkoutSession;
    /** Last time's result per sequence-entry id, for the reference column. */
    previous: Record<string, ActualResult>;
    /** The draft or recorded result per sequence-entry id. */
    drafts: Record<string, ActualResult>;
    readOnly: boolean;
    onDraftChange: (sequenceEntryId: SequenceEntryId, draft: ActualResult) => void;
    onLog: (sequenceEntryId: SequenceEntryId) => void;
    onClear: (sequenceEntryId: SequenceEntryId) => void;
}

/**
 * One exercise's sets as a compact table: a target summary, one ~44px row per
 * set, and an editable weight/reps cell pair. Replaces the previous one-card-
 * per-set layout, which cost 300-700px per set and pushed the plan several
 * screens down.
 */
function ExerciseBlock(props: ExerciseBlockProps): JSX.Element {
    const targets = () =>
        props.occurrences.map((occurrence) => formatMeasurement(occurrence.set.prescription.measurement));
    const logged = () =>
        props.occurrences.filter((occurrence) =>
            props.session.results.some((result) => result.sequenceEntryId === occurrence.entry.id)
        ).length;

    return (
        <article class="card exercise-block">
            <header class="exercise-block__header">
                <h2 class="exercise-block__name">{props.occurrences[0]?.exercise.name}</h2>
                <span class="exercise-block__progress">
                    {logged()}/{props.occurrences.length}
                </span>
            </header>
            <p class="exercise-block__target">{summarizeTargets(targets())}</p>
            <table class="set-table">
                <thead>
                    <tr>
                        <th class="set-table__set" scope="col">
                            #
                        </th>
                        <th class="set-table__prev" scope="col">
                            Prev
                        </th>
                        <th class="set-table__weight" scope="col">
                            Weight
                        </th>
                        <th class="set-table__count" scope="col">
                            {props.occurrences[0]?.set.prescription.measurement.measurement === 'duration'
                                ? 'Secs'
                                : 'Reps'}
                        </th>
                        <th class="set-table__check" scope="col">
                            <span class="visually-hidden">Done</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <For each={props.occurrences}>
                        {(occurrence, index) => (
                            <SetRow
                                occurrence={occurrence}
                                index={index()}
                                previous={props.previous[occurrence.entry.id]}
                                draft={props.drafts[occurrence.entry.id]}
                                recorded={props.session.results.some(
                                    (result) => result.sequenceEntryId === occurrence.entry.id
                                )}
                                readOnly={props.readOnly}
                                onDraftChange={(draft) => props.onDraftChange(occurrence.entry.id, draft)}
                                onLog={() => props.onLog(occurrence.entry.id)}
                                onClear={() => props.onClear(occurrence.entry.id)}
                            />
                        )}
                    </For>
                </tbody>
            </table>
        </article>
    );
}

interface SetRowProps {
    occurrence: SequenceOccurrence;
    index: number;
    previous: ActualResult | undefined;
    draft: ActualResult | undefined;
    recorded: boolean;
    readOnly: boolean;
    onDraftChange: (draft: ActualResult) => void;
    onLog: () => void;
    onClear: () => void;
}

/** One set's row: a number, last time's numbers, editable numbers, and a done toggle. */
function SetRow(props: SetRowProps): JSX.Element {
    const cells = () => (props.draft ? resultCells(props.draft) : undefined);
    const prefix = () => `${props.occurrence.exercise.name} set ${props.index + 1}`;

    return (
        <tr class="set-row" classList={{ 'set-row--done': props.recorded }}>
            <th class="set-table__set" scope="row">
                <span class="set-badge">{props.index + 1}</span>
            </th>
            <td class="set-table__prev">
                <Show when={props.previous} fallback={<span class="set-cell set-cell--muted">—</span>}>
                    {(previous) => <span class="set-cell set-cell--muted">{formatSetReference(previous())}</span>}
                </Show>
            </td>
            <td class="set-table__weight">
                <Show when={cells()}>
                    {(shape) => (
                        <Show
                            when={shape().load === 'weight'}
                            fallback={<span class="set-cell set-cell--muted">{bodyweightMarker(props.draft)}</span>}
                        >
                            <CompactNumberField
                                label={`${prefix()} weight`}
                                value={weightValue(props.draft)}
                                min={0}
                                disabled={props.readOnly}
                                onChange={(value) => props.draft && props.onDraftChange(withWeight(props.draft, value))}
                            />
                        </Show>
                    )}
                </Show>
            </td>
            <td class="set-table__count">
                <Show when={cells()}>
                    {(shape) => (
                        <Show
                            when={shape().count === 'perSide'}
                            fallback={
                                <CompactNumberField
                                    label={`${prefix()} ${shape().unit}`}
                                    value={countValue(props.draft)}
                                    min={0}
                                    integer={shape().unit === 'reps'}
                                    disabled={props.readOnly}
                                    onChange={(value) =>
                                        props.draft && props.onDraftChange(withTotalCount(props.draft, value))
                                    }
                                />
                            }
                        >
                            <div class="set-pair">
                                <CompactNumberField
                                    label={`${prefix()} left ${shape().unit}`}
                                    value={sideCount(props.draft, 'left')}
                                    min={0}
                                    integer={shape().unit === 'reps'}
                                    disabled={props.readOnly}
                                    onChange={(value) =>
                                        props.draft && props.onDraftChange(withSideCount(props.draft, 'left', value))
                                    }
                                />
                                <span class="set-pair__divider">/</span>
                                <CompactNumberField
                                    label={`${prefix()} right ${shape().unit}`}
                                    value={sideCount(props.draft, 'right')}
                                    min={0}
                                    integer={shape().unit === 'reps'}
                                    disabled={props.readOnly}
                                    onChange={(value) =>
                                        props.draft && props.onDraftChange(withSideCount(props.draft, 'right', value))
                                    }
                                />
                            </div>
                        </Show>
                    )}
                </Show>
            </td>
            <td class="set-table__check">
                <Show
                    when={!props.readOnly}
                    fallback={
                        <span class="set-check" aria-hidden="true">
                            {props.recorded ? '✓' : ''}
                        </span>
                    }
                >
                    <Button
                        variant="plain"
                        class="set-check-button"
                        classList={{ 'set-check-button--on': props.recorded }}
                        type="button"
                        aria-pressed={props.recorded}
                        aria-label={`${props.recorded ? 'Clear' : 'Log'} ${prefix()}`}
                        onPress={() => (props.recorded ? props.onClear() : props.onLog())}
                    >
                        {props.recorded ? '✓' : '-'}
                    </Button>
                </Show>
            </td>
        </tr>
    );
}

/** A bodyweight set has no editable mass, so its cell states that instead of showing a zero. */
function bodyweightMarker(draft: ActualResult | undefined): string {
    return draft?.load.kind === 'bodyweight' ? 'BW' : '—';
}

function weightValue(draft: ActualResult | undefined): number {
    return draft ? (externalWeightValue(draft.load) ?? 0) : 0;
}

function countValue(draft: ActualResult | undefined): number {
    return draft ? (totalCountValue(draft.measurement) ?? 0) : 0;
}

function sideCount(draft: ActualResult | undefined, side: 'left' | 'right'): number {
    return draft ? (sideCountValues(draft.measurement)?.[side] ?? 0) : 0;
}

export { ExerciseBlock };
