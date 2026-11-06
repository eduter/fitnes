import { createSignal, For, type JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import type { PickerOption } from '../OptionPicker/OptionPicker.tsx';
import { Popover } from '../Popover/Popover.tsx';
import './MultiPicker.css';

/** A wrapping selection summary and an immediate multi-choice menu that stays open until End. */
function MultiPicker(props: MultiPickerProps): JSX.Element {
    const [open, setOpen] = createSignal(false);
    let trigger: HTMLButtonElement | undefined;
    const selected = () => props.options.filter((option) => props.values.includes(option.value));
    const summary = () => {
        const labels = selected()
            .slice(0, 2)
            .map((option) => option.label)
            .join(', ');
        return selected().length ? `${labels}${selected().length > 2 ? ` +${selected().length - 2}` : ''}` : 'None';
    };
    function toggle(value: string): void {
        props.onChange(
            props.values.includes(value) ? props.values.filter((v) => v !== value) : [...props.values, value]
        );
    }
    return (
        <fieldset class="nes-multi-picker nes-control">
            <legend>{props.label}</legend>
            <Button
                variant="plain"
                ref={(element) => {
                    trigger = element;
                }}
                aria-label={`${props.label}: ${summary()}`}
                aria-expanded={open()}
                aria-haspopup="dialog"
                onPress={() => setOpen(true)}
            >
                {summary()}
            </Button>
            <Popover
                open={open()}
                onOpenChange={setOpen}
                label={`Choose ${props.label}`}
                mount={props.popoverMount}
                anchor={() => trigger}
                returnFocus={() => trigger}
                width={160}
            >
                <div class="nes-multi-picker__options">
                    <For each={props.options}>
                        {(option) => (
                            <Button
                                variant="plain"
                                aria-pressed={props.values.includes(option.value)}
                                onPress={() => toggle(option.value)}
                            >
                                <span aria-hidden="true">{props.values.includes(option.value) ? '[x] ' : '[ ] '}</span>
                                {option.label}
                            </Button>
                        )}
                    </For>
                    <Button onPress={() => setOpen(false)}>End</Button>
                </div>
            </Popover>
        </fieldset>
    );
}

/** Existing membership edits apply immediately; End and outside dismissal only close the menu. */
interface MultiPickerProps {
    label: string;
    values: readonly string[];
    options: readonly PickerOption[];
    onChange: (values: string[]) => void;
    popoverMount?: HTMLElement;
}

export type { MultiPickerProps };
export { MultiPicker };
