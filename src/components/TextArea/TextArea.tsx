import { createUniqueId, type JSX } from 'solid-js';
import './TextArea.css';

/** Native multiline entry inside a bounded editor window, retaining the phone keyboard. */
function TextArea(props: TextAreaProps): JSX.Element {
    const id = createUniqueId();
    return (
        <label class="nes-text-area nes-control" for={id}>
            <span>{props.label}</span>
            <textarea
                id={id}
                value={props.value}
                rows={4}
                onInput={(event) => props.onChange(event.currentTarget.value)}
            />
        </label>
    );
}
/** Controlled multiline text; the caller owns persistence. */
interface TextAreaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export type { TextAreaProps };
export { TextArea };
