import { createEffect, createSignal, type JSX, on, untrack } from 'solid-js';
import { DialogActions } from '../DialogActions.tsx';
import { Popover } from '../Popover/Popover.tsx';
import './ConfirmDialog.css';

/** A two-action confirmation window; outside dismissal cancels without invoking the action. */
function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
    const [message, setMessage] = createSignal(props.message);
    createEffect(
        on(
            () => props.open,
            (open) => {
                if (open) {
                    setMessage(untrack(() => props.message));
                }
            }
        )
    );
    return (
        <Popover
            open={props.open}
            onOpenChange={props.onOpenChange}
            label={message()}
            mount={props.mount}
            anchor={props.trigger}
            returnFocus={props.trigger}
            width={208}
        >
            <p class="nes-confirm-message">{message()}</p>
            <DialogActions
                kind="confirm"
                onConfirm={() => {
                    props.onConfirm();
                    props.onOpenChange(false);
                }}
                onCancel={() => props.onOpenChange(false)}
            />
        </Popover>
    );
}
/** Destructive actions occur only through the explicit action button. */
interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    message: string;
    onConfirm: () => void;
    mount?: HTMLElement;
    trigger?: () => HTMLElement | undefined;
}

export type { ConfirmDialogProps };
export { ConfirmDialog };
