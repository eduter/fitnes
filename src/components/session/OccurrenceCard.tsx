import { Show, type JSX } from 'solid-js';
import { formatLoad, formatMeasurement, formatWeight } from '../../domain/format.ts';
import { sessionBodyweightWeight, type SequenceOccurrence } from '../../domain/lookups.ts';
import { totalLoad, type ActualResult, type WorkoutSession } from '../../domain/session.ts';
import { ResultFields } from './ResultFields.tsx';

interface OccurrenceCardProps {
    session: WorkoutSession;
    occurrence: SequenceOccurrence;
    result: ActualResult | undefined;
    draft: ActualResult;
    readOnly: boolean;
    onDraftChange: (draft: ActualResult) => void;
    onLog: () => void;
    onEdit: (draft: ActualResult) => void;
    onClear: () => void;
}

/** One sequence occurrence: prescription, optional actual, and logging controls. */
function OccurrenceCard(props: OccurrenceCardProps): JSX.Element {
    const combined = (): string | undefined => {
        const load = props.result?.load ?? props.occurrence.set.prescription.load;
        const total = totalLoad(load, sessionBodyweightWeight(props.session));
        return total ? formatWeight(total) : undefined;
    };

    return (
        <article class="card">
            <h2 class="card-title">{props.occurrence.exercise.name}</h2>
            <p class="card-meta">
                prescribed {formatMeasurement(props.occurrence.set.prescription.measurement)} ·{' '}
                {formatLoad(props.occurrence.set.prescription.load)} · {props.occurrence.set.prescription.executionMode}
            </p>
            <Show when={props.result}>
                {(result) => (
                    <p>
                        actual {formatMeasurement(result().measurement)} · {formatLoad(result().load)}
                        <Show when={combined()}>{(total) => <> · total {total()}</>}</Show>
                    </p>
                )}
            </Show>
            <Show when={!combined()}>
                <p class="muted">
                    Combined totalLoad is undefined (no load, per-hand/per-side basis, missing bodyweight, or mixed
                    units).
                </p>
            </Show>
            <Show when={!props.readOnly}>
                <ResultFields
                    exercise={props.occurrence.exercise}
                    value={props.draft}
                    onChange={(next) => {
                        props.onDraftChange(next);
                        if (props.result) {
                            props.onEdit(next);
                        }
                    }}
                />
                <div class="button-row">
                    <Show when={!props.result}>
                        <button class="btn btn--primary" type="button" onClick={props.onLog}>
                            Log
                        </button>
                    </Show>
                    <Show when={props.result}>
                        <button class="btn btn--secondary" type="button" onClick={props.onClear}>
                            Clear
                        </button>
                    </Show>
                </div>
            </Show>
        </article>
    );
}

export { OccurrenceCard };
