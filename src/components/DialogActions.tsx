import { type JSX, Show } from 'solid-js';
import { Button } from './Button/Button.tsx';
import './DialogActions.css';

/** Shared action copy, kept separate from screen-specific form logic. */
const dialogActionCopy = {
    end: { confirm: 'End', cancel: 'Cancel' },
    save: { confirm: 'Save', cancel: 'Cancel' },
    create: { confirm: 'Create', cancel: 'Cancel' },
    add: { confirm: 'Add', cancel: 'Cancel' },
    confirm: { confirm: 'Yes', cancel: 'No' },
};

/** Negative action on the left, positive action (or End) on the right. */
function DialogActions(props: DialogActionsProps): JSX.Element {
    return (
        <div class="nes-dialog-actions">
            <Show when={props.onCancel}>
                <Button disabled={props.disabled} onPress={() => props.onCancel?.()}>
                    {dialogActionCopy[props.kind].cancel}
                </Button>
            </Show>
            <Button disabled={props.disabled || props.confirmDisabled} onPress={props.onConfirm}>
                {dialogActionCopy[props.kind].confirm}
            </Button>
        </div>
    );
}

/** End closes immediate edits; other kinds explicitly commit a draft or action. */
interface DialogActionsProps {
    kind: keyof typeof dialogActionCopy;
    onConfirm: () => void;
    onCancel?: () => void;
    disabled?: boolean;
    confirmDisabled?: boolean;
}

export type { DialogActionsProps };
export { DialogActions, dialogActionCopy };
