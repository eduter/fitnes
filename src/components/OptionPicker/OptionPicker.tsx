import { createEffect, createSignal, createUniqueId, For, type JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { Popover } from '../Popover/Popover.tsx';
import './OptionPicker.css';

/** A labelled text value opening a menu of choices, including two-choice settings. */
function OptionPicker(props: OptionPickerProps): JSX.Element {
    const [open, setOpen] = createSignal(false);
    const labelId = createUniqueId();
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
        <div class="nes-option-picker nes-control">
            <span id={labelId}>{props.label}</span>
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
                returnFocus={() => trigger}
            >
                <div class="nes-option-picker__menu">
                    <p class="nes-option-picker__title">{props.label}</p>
                    <For each={props.options}>
                        {(option) => (
                            <Button
                                aria-pressed={option.value === props.value}
                                data-popover-autofocus={option.value === props.value ? '' : undefined}
                                onPress={() => choose(option.value)}
                            >
                                {option.label}
                            </Button>
                        )}
                    </For>
                    <Button onPress={() => setOpen(false)}>Back</Button>
                </div>
            </Popover>
        </div>
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
    value: string;
    options: readonly PickerOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
    popoverMount?: HTMLElement;
}

export type { OptionPickerProps, PickerOption };
export { OptionPicker };
