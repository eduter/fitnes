import type { JSX } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { Popover } from '../Popover/Popover.tsx';

/** App menus use the same stepped popover and action language as the spinner. */
function MenuDialog(props: MenuDialogProps): JSX.Element {
    return (
        <Popover
            open={props.open}
            onOpenChange={(open) => {
                if (!open) {
                    props.onClose();
                }
            }}
            label={props.title}
            mount={document.getElementById('root') ?? undefined}
            height={props.height ?? 400}
            class="app-menu"
        >
            <div class="stack app-menu__body">
                <h2 class="card-title">{props.title}</h2>
                {props.children}
                <Button onPress={() => props.onClose()}>Back</Button>
            </div>
        </Popover>
    );
}

/** A controlled menu retains its reverse closing animation before leaving the DOM. */
interface MenuDialogProps {
    title: string;
    open: boolean;
    height?: number;
    onClose: () => void;
    children: JSX.Element;
}

export { MenuDialog };
