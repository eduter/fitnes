import { createEffect, createSignal, createUniqueId, For, type JSX, onMount } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { Button } from '../Button/Button.tsx';
import { Popover } from '../Popover/Popover.tsx';
import './OptionPicker.css';

/** A labelled text value opening a menu of choices, including two-choice settings. */
function OptionPicker(props: OptionPickerProps): JSX.Element {
    const [open, setOpen] = createSignal(false);
    const labelId = createUniqueId();
    const [width, setWidth] = createSignal(64);
    let label: HTMLElement | undefined;
    let sizer: HTMLSpanElement | undefined;
    onMount(() => {
        const measure = () => setWidth((sizer?.offsetWidth ?? 54) + 10);
        measure();
        void document.fonts?.ready.then(measure);
    });
    let trigger: HTMLButtonElement | undefined;
    const selected = () => props.options.find((option) => option.value === props.value);
    createEffect(() => {
        if (props.disabled) {
            setOpen(false);
        }
    });

    function choose(value: string): void {
        props.onChange(value);
        setOpen(false);
    }

    return (
        <Dynamic
            component={props.layout === 'framed' ? 'fieldset' : 'div'}
            class="nes-option-picker nes-control"
            data-layout={props.layout ?? 'stacked'}
        >
            <Dynamic
                component={props.layout === 'framed' ? 'legend' : 'span'}
                id={labelId}
                ref={(element: HTMLElement) => {
                    label = element;
                }}
                class="nes-option-picker__label"
            >
                {props.label}
                {props.layout === 'row' ? ':' : ''}
            </Dynamic>
            <span class="nes-option-picker__sizer" aria-hidden="true" ref={sizer}>
                <For each={props.options}>{(option) => <span>{option.label}</span>}</For>
            </span>
            <Button
                ref={(element) => {
                    trigger = element;
                }}
                variant="plain"
                class="nes-option-picker__value"
                disabled={props.disabled}
                aria-label={`${props.label}: ${selected()?.label ?? props.value}`}
                aria-haspopup="dialog"
                aria-expanded={open()}
                onPress={() => setOpen(true)}
            >
                {selected()?.label ?? props.value}
            </Button>
            <Popover
                open={open()}
                onOpenChange={setOpen}
                label={`Choose ${props.label}`}
                mount={props.popoverMount}
                width={width()}
                placement={props.layout === 'row' ? 'right' : 'vertical'}
                anchor={() => (props.layout === 'row' ? label : trigger)}
                returnFocus={() => trigger}
            >
                <div class="nes-option-picker__menu">
                    <For each={props.options}>
                        {(option) => (
                            <Button
                                variant="plain"
                                aria-pressed={option.value === props.value}
                                data-popover-autofocus={option.value === props.value ? '' : undefined}
                                onPress={() => choose(option.value)}
                            >
                                {option.label}
                            </Button>
                        )}
                    </For>
                </div>
            </Popover>
        </Dynamic>
    );
}

/** Stored value and visible text for an available choice. */
interface PickerOption {
    value: string;
    label: string;
}

/** Controlled selection; the caller owns persistence. */
interface OptionPickerProps {
    label: string;
    layout?: 'stacked' | 'framed' | 'row';
    value: string;
    options: readonly PickerOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
    popoverMount?: HTMLElement;
}

export type { OptionPickerProps, PickerOption };
export { OptionPicker };
