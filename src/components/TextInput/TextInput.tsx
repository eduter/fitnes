import { createUniqueId, type JSX, splitProps } from 'solid-js';
import { controlClasses } from '../Controls/controlClasses.ts';
import '../../styles/controls.css';
import './TextInput.css';

/** A legend-framed native input that retains normal selection, IME and virtual-keyboard behavior. */
function TextInput(props: TextInputProps): JSX.Element {
    const [local, rest] = splitProps(props, ['label', 'id', 'class', 'classList']);
    const generatedId = createUniqueId();
    const id = () => local.id ?? generatedId;
    return (
        <fieldset class={controlClasses('nes-text-input nes-frame nes-control', local)}>
            <legend class="nes-text-input__label">{local.label}</legend>
            <span class="nes-text-input__frame">
                <input
                    {...rest}
                    aria-label={local.label}
                    id={id()}
                    type={props.type ?? 'text'}
                    class="nes-text-input__native"
                />
            </span>
        </fieldset>
    );
}

/** Native input attributes; classes style the wrapper, while ref and events target the actual input. */
interface TextInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    type?: 'text' | 'search' | 'email' | 'tel' | 'url' | 'password';
    label: string;
}

export type { TextInputProps };
export { TextInput };
