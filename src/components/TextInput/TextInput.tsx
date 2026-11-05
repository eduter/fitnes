import { createUniqueId, type JSX, splitProps } from 'solid-js';
import { controlClasses } from '../Controls/controlClasses.ts';
import '../../styles/controls.css';
import './TextInput.css';

/** A corner-framed native input that retains normal selection, IME and virtual-keyboard behavior. */
function TextInput(props: TextInputProps): JSX.Element {
    const [local, rest] = splitProps(props, ['label', 'id', 'class', 'classList']);
    const generatedId = createUniqueId();
    const id = () => local.id ?? generatedId;
    return (
        <div class={controlClasses('nes-text-input nes-control', local)}>
            <label class="nes-text-input__label" for={id()}>
                {local.label}
            </label>
            <span class="nes-text-input__frame nes-corners">
                <input {...rest} id={id()} type={props.type ?? 'text'} class="nes-text-input__native" />
            </span>
        </div>
    );
}

/** Native input attributes; classes style the wrapper, while ref and events target the actual input. */
interface TextInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export { TextInput };
export type { TextInputProps };
