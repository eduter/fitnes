import { createEffect, createMemo, createSignal, createUniqueId, type JSX, splitProps } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { controlClasses } from '../Controls/controlClasses.ts';
import { Triangle } from '../Controls/Glyph.tsx';
import { Popover } from '../Popover/Popover.tsx';
import { NumberPad } from './NumberPad.tsx';
import { formatMaskedNumber, type NumberMask, stepNumber } from './numberMask.ts';
import '../../styles/controls.css';
import './Spinner.css';

/** A controlled fixed-mask quantity with borderless steps and an animated number-pad popover. */
function Spinner(props: SpinnerProps): JSX.Element {
    const [local, rest] = splitProps(props, [
        'label',
        'value',
        'onChange',
        'step',
        'min',
        'max',
        'integerDigits',
        'fractionDigits',
        'disabled',
        'popoverMount',
        'class',
        'classList',
    ]);
    const [open, setOpen] = createSignal(false);
    const labelId = createUniqueId();
    let opener: HTMLButtonElement | undefined;
    createEffect(() => {
        if (local.disabled) {
            setOpen(false);
        }
    });
    const mask = createMemo<NumberMask>(() => {
        const integerDigits = local.integerDigits ?? 2;
        const fractionDigits = local.fractionDigits ?? 0;
        if (
            !Number.isInteger(integerDigits) ||
            integerDigits < 1 ||
            !Number.isInteger(fractionDigits) ||
            fractionDigits < 0 ||
            integerDigits + fractionDigits > 5
        ) {
            throw new Error(
                'Spinner requires positive integerDigits, nonnegative fractionDigits, and at most five digits'
            );
        }
        const capacity = (10 ** (integerDigits + fractionDigits) - 1) / 10 ** fractionDigits;
        const min = local.min ?? 0;
        const max = local.max ?? capacity;
        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > capacity) {
            throw new Error('Spinner bounds must fit its nonnegative fixed mask');
        }
        const scale = 10 ** fractionDigits;
        if (
            Math.abs(min * scale - Math.round(min * scale)) > 1e-6 ||
            Math.abs(max * scale - Math.round(max * scale)) > 1e-6
        ) {
            throw new Error('Spinner bounds must be representable at the displayed precision');
        }
        const normalizedMin = Math.round(min * scale) / scale;
        const normalizedMax = Math.round(max * scale) / scale;
        if (!Number.isFinite(local.value) || local.value < normalizedMin || local.value > normalizedMax) {
            throw new Error('Spinner value must be finite and within its configured bounds');
        }
        const step = local.step ?? 1;
        const stepUnits = step * 10 ** fractionDigits;
        if (
            !Number.isFinite(step) ||
            step <= 0 ||
            Math.round(stepUnits) < 1 ||
            Math.abs(stepUnits - Math.round(stepUnits)) > 1e-6
        ) {
            throw new Error('Spinner step must be positive and representable at the displayed precision');
        }
        return { integerDigits, fractionDigits, min: normalizedMin, max: normalizedMax };
    });
    const masked = () => formatMaskedNumber(local.value, mask());
    const adjust = (direction: 1 | -1) => local.onChange(stepNumber(local.value, local.step ?? 1, direction, mask()));

    return (
        <fieldset
            {...rest}
            class={controlClasses('nes-spinner nes-frame nes-control', local)}
            aria-labelledby={labelId}
        >
            <legend id={labelId} class="nes-spinner__label">
                {local.label}
            </legend>
            <div class="nes-spinner__controls">
                <span
                    class="nes-spinner__value-frame"
                    style={{ 'inline-size': `${Math.max(34, masked().length * 7 + 8)}px` }}
                >
                    <Button
                        ref={(element) => {
                            opener = element;
                        }}
                        class="nes-spinner__value"
                        variant="plain"
                        disabled={local.disabled}
                        aria-label={`${local.label}: ${masked()}. Edit number`}
                        aria-haspopup="dialog"
                        aria-expanded={open()}
                        onPress={() => setOpen(true)}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                                event.preventDefault();
                                adjust(event.key === 'ArrowUp' ? 1 : -1);
                            }
                        }}
                    >
                        {masked()}
                    </Button>
                </span>
                <div class="nes-spinner__arrows">
                    <Button
                        class="nes-spinner__arrow nes-spinner__arrow--up"
                        variant="plain"
                        disabled={local.disabled || local.value >= mask().max}
                        aria-label={`Increase ${local.label}`}
                        onPress={() => adjust(1)}
                    >
                        <Triangle direction="up" />
                    </Button>
                    <Button
                        class="nes-spinner__arrow nes-spinner__arrow--down"
                        variant="plain"
                        disabled={local.disabled || local.value <= mask().min}
                        aria-label={`Decrease ${local.label}`}
                        onPress={() => adjust(-1)}
                    >
                        <Triangle direction="down" />
                    </Button>
                </div>
            </div>
            <output class="nes-visually-hidden" aria-live="polite">
                {local.label}: {masked()}
            </output>
            <Popover
                open={open()}
                onOpenChange={setOpen}
                label={`Edit ${local.label}`}
                mount={local.popoverMount}
                height={256}
                anchor={() => opener}
                returnFocus={() => opener}
            >
                <NumberPad
                    label={local.label}
                    value={local.value}
                    mask={mask()}
                    onChange={local.onChange}
                    onDone={() => setOpen(false)}
                />
            </Popover>
        </fieldset>
    );
}

/** Fixed-mask numeric value; changes belong to the caller, including persistence and equipment step configuration. */
interface SpinnerProps extends Omit<JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'children'> {
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number;
    min?: number;
    max?: number;
    integerDigits?: number;
    fractionDigits?: number;
    disabled?: boolean;
    popoverMount?: HTMLElement;
}

export type { SpinnerProps };
export { Spinner };
