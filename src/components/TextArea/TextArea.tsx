import { createUniqueId, type JSX } from 'solid-js';
import '../../styles/controls.css';
import './TextArea.css';

/** Native multiline entry directly in a framed page or editor, retaining the phone keyboard. */
function TextArea(props: TextAreaProps): JSX.Element {
    const id = createUniqueId();
    return (
        <fieldset class="nes-text-area nes-frame nes-control">
            <legend>{props.label}</legend>
            <textarea
                aria-label={props.label}
                id={id}
                value={props.value}
                rows={props.rows ?? 4}
                disabled={props.disabled}
                style={{ height: `${(props.rows ?? 4) * 16 + 4}px` }}
                onInput={(event) => props.onChange(event.currentTarget.value)}
            />
        </fieldset>
    );
}
/** Controlled multiline text; the caller owns persistence. */
interface TextAreaProps {
    label: string;
    rows?: number;
    disabled?: boolean;
    value: string;
    onChange: (value: string) => void;
}

export type { TextAreaProps };
export { TextArea };
