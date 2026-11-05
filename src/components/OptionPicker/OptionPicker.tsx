import { createSignal, createUniqueId, For, type JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { Triangle } from '../Controls/Glyph.tsx';
import { Popover } from '../Popover/Popover.tsx';
import './OptionPicker.css';

/** A corner-framed value that opens the same anchored menu as a numerical spinner. */
function OptionPicker(props: OptionPickerProps): JSX.Element {
    const [open, setOpen] = createSignal(false);
    const labelId = createUniqueId();
    let trigger: HTMLButtonElement | undefined;
    const selected = () => props.options.find((option) => option.value === props.value);

    function choose(value: string): void {
        props.onChange(value);
        setOpen(false);
    }

    return (
        <div class="nes-option-picker nes-control" data-disabled={props.disabled ? '' : undefined}>
            <span id={labelId} class="nes-option-picker__label">
                {props.label}
            </span>
            <span class="nes-option-picker__frame nes-corners">
                <Button
                    ref={(element) => {
                        trigger = element;
                    }}
                    variant="plain"
                    class="nes-option-picker__value"
                    disabled={props.disabled}
                    aria-label={`${props.label}: ${selected()?.label ?? props.value}. Choose option`}
                    aria-haspopup="dialog"
                    aria-expanded={open()}
                    onPress={() => setOpen(true)}
                >
                    <span>{selected()?.label ?? props.value}</span>
                    <Triangle direction="down" />
                </Button>
            </span>
            <Popover
                open={open()}
                onOpenChange={setOpen}
                label={`Choose ${props.label}`}
                mount={props.popoverMount}
                anchor={() => trigger}
                returnFocus={() => trigger}
                height={Math.min(400, 64 + props.options.length * 36)}
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
                                {option.value === props.value ? ' ✓' : ''}
                            </Button>
                        )}
                    </For>
                    <Button onPress={() => setOpen(false)}>Back</Button>
                </div>
            </Popover>
        </div>
    );
}

/** An option's stored value and mixed-case display label. */
interface PickerOption {
    value: string;
    label: string;
}

/** Controlled selection persists through the caller's usual onChange path. */
interface OptionPickerProps {
    label: string;
    value: string;
    options: PickerOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
    popoverMount?: HTMLElement;
}

export { OptionPicker };
export type { OptionPickerProps, PickerOption };
