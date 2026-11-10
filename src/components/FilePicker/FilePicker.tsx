import type { JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';

/** Open the device file chooser through a shared action without exposing a native input widget. */
function FilePicker(props: FilePickerProps): JSX.Element {
    let input: HTMLInputElement | undefined;

    return (
        <>
            <input
                ref={input}
                type="file"
                hidden
                aria-label={props.label}
                accept={props.accept}
                disabled={props.disabled}
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    // Reset before reading so choosing the same file again fires a change
                    event.currentTarget.value = '';
                    if (file) {
                        props.onSelect(file);
                    }
                }}
            />
            <Button disabled={props.disabled} onPress={() => input?.click()}>
                {props.label}
            </Button>
        </>
    );
}

/** File selection only; the caller owns reading, validation, and persistence. */
interface FilePickerProps {
    label: string;
    accept: string;
    disabled?: boolean;
    onSelect: (file: File) => void;
}

export { FilePicker };
export type { FilePickerProps };
