import { Show, type JSX } from 'solid-js';
import { formatLoad, formatMeasurement } from '../../domain/format.ts';
import type { ActualResult } from '../../domain/session.ts';
import { NumberField } from '../fields.tsx';
import type { CurrentSet } from './currentSet.ts';
import {
    externalWeightValue,
    formatSetReference,
    resultCells,
    sideCountValues,
    totalCountValue,
    withSideCount,
    withTotalCount,
    withWeight,
} from './resultEditing.ts';

interface CurrentSetPanelProps {
    current: CurrentSet;
    draft: ActualResult;
    previous?: ActualResult;
    busy: boolean;
    onChange: (draft: ActualResult) => void;
    onLog: () => void;
}

/** Put the current prescription, actuals, and one logging action in the thumb's path. */
function CurrentSetPanel(props: CurrentSetPanelProps): JSX.Element {
    const shape = () => resultCells(props.draft);
    const load = () => props.draft.load;
    const unit = () => (shape().unit === 'reps' ? 'Reps' : 'Seconds');
    const massLabel = () => {
        const value = load();
        if (value.kind !== 'external' && value.kind !== 'bodyweightExternal') {
            return 'Load';
        }
        return `${value.kind === 'bodyweightExternal' ? '+ ' : ''}${value.weight.unit} ${value.basis === 'perSide' ? '/ side' : 'total'}`;
    };

    return (
        <article class="current-set" aria-label="Current set">
            <p class="current-set__kicker">CURRENT · SET {props.current.exerciseSet}</p>
            <h2 class="current-set__name">{props.current.occurrence.exercise.name}</h2>
            <p class="muted">
                Target: {formatMeasurement(props.current.occurrence.set.prescription.measurement)}
                <br />
                {formatLoad(props.current.occurrence.set.prescription.load)}
            </p>
            <Show when={props.draft.load.kind === 'bodyweightExternal'}>
                <p class="muted">Bodyweight + external load</p>
            </Show>
            <div class="current-set__fields">
                <Show
                    when={shape().load === 'weight'}
                    fallback={
                        <p class="form-field">
                            <span class="form-label">LOAD</span>
                            {shape().load === 'bodyweight' ? 'Bodyweight' : 'No load'}
                        </p>
                    }
                >
                    <NumberField
                        label={massLabel()}
                        value={externalWeightValue(load()) ?? 0}
                        min={0}
                        disabled={props.busy}
                        onChange={(value) => props.onChange(withWeight(props.draft, value))}
                    />
                </Show>
                <Show when={shape().count === 'total'}>
                    <NumberField
                        label={unit()}
                        value={totalCountValue(props.draft.measurement) ?? 0}
                        min={0}
                        step={shape().unit === 'reps' ? 1 : 'any'}
                        disabled={props.busy}
                        onChange={(value) => props.onChange(withTotalCount(props.draft, value))}
                    />
                </Show>
                <Show when={shape().count === 'perSide'}>
                    <NumberField
                        label={`Left ${unit()}`}
                        value={sideCountValues(props.draft.measurement)?.left ?? 0}
                        min={0}
                        disabled={props.busy}
                        onChange={(value) => props.onChange(withSideCount(props.draft, 'left', value))}
                    />
                    <NumberField
                        label={`Right ${unit()}`}
                        value={sideCountValues(props.draft.measurement)?.right ?? 0}
                        min={0}
                        disabled={props.busy}
                        onChange={(value) => props.onChange(withSideCount(props.draft, 'right', value))}
                    />
                </Show>
            </div>
            <p class="current-set__previous">
                Last time<strong>{props.previous ? formatSetReference(props.previous) : 'No previous result'}</strong>
            </p>
            <button class="btn btn--primary" type="button" disabled={props.busy} onClick={props.onLog}>
                {props.busy ? 'Logging…' : 'Log set >'}
            </button>
        </article>
    );
}

export { CurrentSetPanel };
