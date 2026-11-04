import { type JSX, Show, splitProps } from 'solid-js';
import { controlClasses } from '../Controls/controlClasses.ts';
import { Chevron } from '../Controls/Glyph.tsx';
import '../../styles/controls.css';
import './Button.css';

/** A native button with immediate primary-press activation and keyboard click support. */
function Button(props: ButtonProps): JSX.Element {
    const [local, rest] = splitProps(props, ['children', 'class', 'classList', 'onPress', 'variant', 'type']);
    return (
        <button
            {...rest}
            type={local.type ?? 'button'}
            class={controlClasses('nes-button', local)}
            data-variant={local.variant ?? 'action'}
            onPointerDown={(event) => {
                if (event.currentTarget.matches(':disabled') || !event.isPrimary || event.button !== 0) {
                    return;
                }
                event.preventDefault();
                local.onPress?.(event);
            }}
            onClick={(event) => {
                if (!event.currentTarget.matches(':disabled') && event.detail === 0) {
                    local.onPress?.(event);
                }
            }}
        >
            <Show when={local.variant !== 'plain'}>
                <Chevron />
            </Show>
            <span class="nes-button__label">{local.children}</span>
        </button>
    );
}

/** Native button attributes, plus a single press callback used by pointer and keyboard activation. */
interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onPointerDown'> {
    onPress?: JSX.EventHandler<HTMLButtonElement, PointerEvent | MouseEvent>;
    variant?: 'action' | 'plain';
}

export { Button };
export type { ButtonProps };
