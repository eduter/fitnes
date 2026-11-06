import type { JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { Triangle } from '../Controls/Glyph.tsx';
import { isCalendarDate, shiftDate } from './date.ts';
import './DateSpinner.css';

/** A compact framed calendar date with adjacent-day steps and a native picker escape hatch. */
function DateSpinner(props: DateSpinnerProps): JSX.Element {
    let input: HTMLInputElement | undefined;
    return (
        <fieldset class="nes-date-spinner nes-control">
            <legend>{props.label}</legend>
            <div class="nes-date-spinner__body">
                <Button
                    variant="plain"
                    aria-label={`${props.label}: ${props.value.replaceAll('-', '.')}. Open calendar`}
                    disabled={props.disabled}
                    onPress={() => input?.showPicker()}
                >
                    {props.value.replaceAll('-', '.')}
                </Button>
                <div class="nes-date-spinner__arrows">
                    <Button
                        variant="plain"
                        aria-label={`Next day: ${props.label}`}
                        disabled={props.disabled}
                        onPress={() => props.onChange(shiftDate(props.value, 1))}
                    >
                        <Triangle direction="up" />
                    </Button>
                    <Button
                        variant="plain"
                        aria-label={`Previous day: ${props.label}`}
                        disabled={props.disabled}
                        onPress={() => props.onChange(shiftDate(props.value, -1))}
                    >
                        <Triangle direction="down" />
                    </Button>
                </div>
            </div>
            <input
                class="nes-visually-hidden"
                type="date"
                ref={input}
                tabindex="-1"
                aria-label={`${props.label} calendar`}
                disabled={props.disabled}
                value={props.value}
                min="0001-01-01"
                max="9999-12-31"
                onInput={(event) => {
                    const value = event.currentTarget.value;
                    if (isCalendarDate(value)) {
                        props.onChange(value);
                    }
                }}
            />
        </fieldset>
    );
}

/** A local calendar date in YYYY-MM-DD form; display uses YYYY.MM.DD. */
interface DateSpinnerProps {
    label: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}

export type { DateSpinnerProps };
export { DateSpinner };
