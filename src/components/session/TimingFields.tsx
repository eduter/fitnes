import { exerciseCopy } from '../../copy/exercise.ts';
import { type JSX, Show } from 'solid-js';
import { effectiveTiming, normalizeSetTiming, type TrackingTiming } from '../../domain/trackingTiming.ts';
import { Spinner } from '../Controls/index.ts';

/** Show effective exercise defaults without writing them; sparse set edits store only differences. */
function TimingFields(props: TimingFieldsProps): JSX.Element {
    function change(field: keyof TrackingTiming, value: number): void {
        const next = { ...props.value, [field]: value };
        props.onChange(props.sparse ? (normalizeSetTiming(props.defaults, next) ?? {}) : next);
    }
    return (
        <div class="editor-fields">
            {(['prepSeconds', 'secondsPerRep'] as const).map((field) => (
                <Show when={field === 'prepSeconds' || props.paced !== false}>
                    <Spinner
                        label={exerciseCopy.timing[field]}
                        value={effectiveTiming(props.defaults, props.value)[field]}
                        min={field === 'prepSeconds' ? 0 : 0.1}
                        max={field === 'prepSeconds' ? 999 : 99.9}
                        integerDigits={field === 'prepSeconds' ? 3 : 2}
                        fractionDigits={field === 'prepSeconds' ? 0 : 1}
                        step={field === 'prepSeconds' ? 1 : 0.1}
                        onChange={(value) => change(field, value)}
                        popoverMount={document.getElementById('root') ?? undefined}
                    />
                </Show>
            ))}
        </div>
    );
}
interface TimingFieldsProps {
    value?: TrackingTiming;
    defaults?: TrackingTiming;
    sparse?: boolean;
    paced?: boolean;
    onChange: (value: TrackingTiming) => void;
}

export { TimingFields };
