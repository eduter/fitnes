import { type JSX, Show } from 'solid-js';
import { effectiveTiming, type TrackingTiming } from '../../domain/trackingTiming.ts';
import { OptionPicker, Spinner } from '../Controls/index.ts';

/** Edit exercise timing defaults, or independently inherit/override each field in a workout. */
function TimingFields(props: TimingFieldsProps): JSX.Element {
    function change(field: keyof TrackingTiming, value: number | undefined): void {
        const next = { ...props.value };
        if (value === undefined) {
            delete next[field];
        } else {
            next[field] = value;
        }
        props.onChange(next);
    }
    return (
        <div class="editor-fields">
            {(['prepSeconds', 'secondsPerRep'] as const).map((field) => (
                <div class="inline-fields">
                    <Show when={props.inherit}>
                        <OptionPicker
                            label={field === 'prepSeconds' ? 'Preparation' : 'Rep pace'}
                            value={props.value?.[field] === undefined ? 'default' : 'override'}
                            options={[
                                { value: 'default', label: 'Default' },
                                { value: 'override', label: 'Override' },
                            ]}
                            onChange={(value) =>
                                change(field, value === 'default' ? undefined : effectiveTiming(props.defaults)[field])
                            }
                            popoverMount={document.getElementById('root') ?? undefined}
                        />
                    </Show>
                    <Show when={!props.inherit || props.value?.[field] !== undefined}>
                        <Spinner
                            label={field === 'prepSeconds' ? 'Prep seconds' : 'Seconds per rep'}
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
                </div>
            ))}
        </div>
    );
}
interface TimingFieldsProps {
    value?: TrackingTiming;
    defaults?: TrackingTiming;
    inherit?: boolean;
    onChange: (value: TrackingTiming) => void;
}

export { TimingFields };
