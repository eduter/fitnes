import { createSignal, type JSX, Show } from 'solid-js';
import { useAppData } from '../../app/AppData.tsx';
import { massValue } from '../../domain/convertWeight.ts';
import type { WeightUnit } from '../../domain/units.ts';
import type { SequenceOccurrence } from '../../domain/lookups.ts';
import type { ActualResult } from '../../domain/session.ts';
import { Button, Popover } from '../Controls/index.ts';
import { CompactNumberField } from '../fields.tsx';
import { prescriptionSummary } from '../template/prescriptionSummary.ts';
import {
    formatSetReference,
    resultCells,
    sideCountValues,
    totalCountValue,
    withSideCount,
    withTotalCount,
    withWeight,
} from './resultEditing.ts';

/** One set keeps planned and previous performance beside its immediate log action. */
function SessionSet(props: SessionSetProps): JSX.Element {
    const app = useAppData();
    const [open, setOpen] = createSignal(false);
    let trigger: HTMLElement | undefined;
    const prefix = () => `${props.occurrence.exercise.name} set ${props.index + 1}`;
    const shape = () => props.draft && resultCells(props.draft);
    return (
        <article class="session-set" aria-label={prefix()}>
            <p>
                {props.index + 1}. {props.occurrence.exercise.name}
            </p>
            <p class="muted">Plan: {prescriptionSummary(props.occurrence.set.prescription, app.massUnit())}</p>
            <div class="set-comparison">
                <span>Prev</span>
                <span>Now</span>
                <span>Done</span>
            </div>
            <div class="set-comparison">
                <span>{props.previous ? formatSetReference(props.previous, app.massUnit()) : '—'}</span>
                <Button
                    class="set-value"
                    variant="plain"
                    disabled={props.readOnly}
                    aria-label={`Edit ${prefix()}`}
                    onPress={(event) => {
                        trigger = event.currentTarget;
                        setOpen(true);
                    }}
                >
                    {props.draft ? formatSetReference(props.draft, app.massUnit()) : '—'}
                </Button>
                <Show when={!props.readOnly} fallback={<span>{props.recorded ? 'Yes' : '—'}</span>}>
                    <Button
                        aria-label={`${props.recorded ? 'Clear' : 'Log'} ${prefix()}`}
                        aria-pressed={props.recorded}
                        onPress={() => (props.recorded ? props.onClear() : props.onLog())}
                    >
                        {props.recorded ? 'Yes' : 'Log'}
                    </Button>
                </Show>
            </div>
            <Popover
                open={open()}
                onOpenChange={setOpen}
                label={`Edit ${prefix()}`}
                anchor={() => trigger}
                returnFocus={() => trigger}
                mount={document.getElementById('root') ?? undefined}
            >
                <div class="editor-fields">
                    <p>{prefix()}</p>
                    <Show when={shape()?.load === 'weight'} fallback={<p>{bodyweightMarker(props.draft)}</p>}>
                        <CompactNumberField
                            label={`External ${app.massUnit()}${props.draft?.load.kind === 'external' || props.draft?.load.kind === 'bodyweightExternal' ? (props.draft.load.basis === 'perSide' ? '/side' : '') : ''}`}
                            value={weightValue(props.draft, app.massUnit())}
                            onChange={(value) =>
                                props.draft && props.onDraftChange(withWeight(props.draft, value, app.massUnit()))
                            }
                        />
                    </Show>
                    <Show
                        when={shape()?.count === 'perSide'}
                        fallback={
                            <CompactNumberField
                                label={shape()?.unit ?? 'Reps'}
                                value={countValue(props.draft)}
                                integer={shape()?.unit === 'reps'}
                                onChange={(value) =>
                                    props.draft && props.onDraftChange(withTotalCount(props.draft, value))
                                }
                            />
                        }
                    >
                        <div class="inline-fields">
                            <CompactNumberField
                                label={`Left ${shape()?.unit}`}
                                value={sideCount(props.draft, 'left')}
                                integer={shape()?.unit === 'reps'}
                                onChange={(value) =>
                                    props.draft && props.onDraftChange(withSideCount(props.draft, 'left', value))
                                }
                            />
                            <CompactNumberField
                                label={`Right ${shape()?.unit}`}
                                value={sideCount(props.draft, 'right')}
                                integer={shape()?.unit === 'reps'}
                                onChange={(value) =>
                                    props.draft && props.onDraftChange(withSideCount(props.draft, 'right', value))
                                }
                            />
                        </div>
                    </Show>
                    <Button onPress={() => setOpen(false)}>End</Button>
                </div>
            </Popover>
        </article>
    );
}
interface SessionSetProps {
    occurrence: SequenceOccurrence;
    index: number;
    previous?: ActualResult;
    draft?: ActualResult;
    recorded: boolean;
    readOnly: boolean;
    onDraftChange: (draft: ActualResult) => void;
    onLog: () => void;
    onClear: () => void;
}

/** A bodyweight set has no editable mass, so its cell states that instead of showing a zero. */
function bodyweightMarker(draft: ActualResult | undefined): string {
    return draft?.load.kind === 'bodyweight' ? 'BW' : '—';
}

function weightValue(draft: ActualResult | undefined, unit: WeightUnit): number {
    if (!draft || (draft.load.kind !== 'external' && draft.load.kind !== 'bodyweightExternal')) {
        return 0;
    }
    return massValue(draft.load.weight, unit);
}

function countValue(draft: ActualResult | undefined): number {
    return draft ? (totalCountValue(draft.measurement) ?? 0) : 0;
}

function sideCount(draft: ActualResult | undefined, side: 'left' | 'right'): number {
    return draft ? (sideCountValues(draft.measurement)?.[side] ?? 0) : 0;
}

export { SessionSet };
