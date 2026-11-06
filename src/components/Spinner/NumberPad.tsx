import { createMemo, createSignal, For, type JSX, Show } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { formatMaskedNumber, type NumberMask, replaceNumberDigit } from './numberMask.ts';
import './NumberPad.css';

/** A fixed-mask three-column keypad; edits apply immediately and End only closes it. */
function NumberPad(props: NumberPadProps): JSX.Element {
    const [selected, setSelected] = createSignal(props.mask.integerDigits - 1);
    const slots = createMemo(() =>
        Array.from({ length: props.mask.integerDigits + props.mask.fractionDigits }, (_, i) => i)
    );
    const digits = () => formatMaskedNumber(props.value, props.mask).replace('.', '');
    const buttons: HTMLButtonElement[] = [];

    function select(slot: number): void {
        setSelected(slot);
        buttons[slot]?.focus({ preventScroll: true });
    }
    function choose(digit: number): void {
        props.onChange(replaceNumberDigit(props.value, selected(), digit, props.mask));
        select(Math.min(slots().length - 1, selected() + 1));
    }
    function erase(): void {
        const slot = Math.max(0, selected() - 1);
        props.onChange(replaceNumberDigit(props.value, slot, 0, props.mask));
        select(slot);
    }
    function handleKeys(event: KeyboardEvent): void {
        if (/^\d$/.test(event.key)) {
            event.preventDefault();
            choose(Number(event.key));
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            erase();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            select((selected() + (event.key === 'ArrowRight' ? 1 : slots().length - 1)) % slots().length);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const next = (Number(digits()[selected()]) + (event.key === 'ArrowUp' ? 1 : 9)) % 10;
            props.onChange(replaceNumberDigit(props.value, selected(), next, props.mask));
        }
    }

    return (
        <fieldset class="nes-number-pad" aria-label="Number pad" onKeyDown={handleKeys}>
            <div class="nes-number-pad__slots">
                <For each={slots()}>
                    {(slot) => (
                        <>
                            <Show when={props.mask.fractionDigits > 0 && slot === props.mask.integerDigits}>
                                <span class="nes-number-pad__decimal" aria-hidden="true">
                                    .
                                </span>
                            </Show>
                            <Button
                                ref={(button) => {
                                    buttons[slot] = button;
                                }}
                                variant="plain"
                                class="nes-number-pad__slot"
                                aria-label={`Select digit ${slot + 1}: ${digits()[slot]}`}
                                aria-pressed={selected() === slot}
                                data-popover-autofocus={selected() === slot ? '' : undefined}
                                onFocus={() => setSelected(slot)}
                                onPress={() => select(slot)}
                            >
                                {digits()[slot]}
                            </Button>
                        </>
                    )}
                </For>
            </div>
            <div class="nes-number-pad__keys">
                <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9]}>
                    {(digit) => (
                        <Button variant="plain" aria-label={`Digit ${digit}`} onPress={() => choose(digit)}>
                            {digit}
                        </Button>
                    )}
                </For>
                <Button onPress={erase}>Back</Button>
                <Button variant="plain" aria-label="Digit 0" onPress={() => choose(0)}>
                    0
                </Button>
                <Button onPress={props.onEnd}>End</Button>
            </div>
            <output class="nes-number-pad__announcement" aria-live="polite">
                {props.label}: {formatMaskedNumber(props.value, props.mask)}
            </output>
        </fieldset>
    );
}

/** Controlled nonnegative number and mask for the spinner's keyboard-free editor. */
interface NumberPadProps {
    label: string;
    value: number;
    mask: NumberMask;
    onChange: (value: number) => void;
    onEnd: () => void;
}

export type { NumberPadProps };
export { NumberPad };
