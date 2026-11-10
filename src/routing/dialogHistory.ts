import { type Accessor, createEffect, onCleanup } from 'solid-js';

interface DialogHistoryOptions {
    open: Accessor<boolean>;
    onClose: () => void;
}

interface OpenDialog {
    id: number;
    options: DialogHistoryOptions;
}

const STATE_KEY = 'fitnesDialog';

let nextId = 0;
let nextToken = 0;
let listening = false;
let activeToken: number | undefined;
const stack: OpenDialog[] = [];

/** The token on the current history entry, when it is one this module pushed. */
function currentToken(): number | undefined {
    const state = window.history.state as Record<string, unknown> | null;
    const value = state?.[STATE_KEY];
    return typeof value === 'number' ? value : undefined;
}

/**
 * Push one entry repeating the current URL. Spreading the live state keeps the
 * router's own `_depth` stamp, so a pop back onto it reports no depth change:
 * route matching, scroll restoration and `useBeforeLeave` never fire for it.
 */
function pushPlaceholder(): void {
    activeToken = ++nextToken;
    window.history.pushState({ ...window.history.state, [STATE_KEY]: activeToken }, '');
}

/** Whether any dialog still wants to be open, ignoring ones mid-close. */
function anyOpen(): boolean {
    return stack.some((entry) => entry.options.open());
}

/** The browser left the placeholder: dismiss the newest dialog. */
function handlePopState(): void {
    if (activeToken === undefined || currentToken() === activeToken) {
        return;
    }
    activeToken = undefined;
    stack[stack.length - 1]?.options.onClose();
    // A nested dialog, or one that refused a dirty close, keeps a placeholder so
    // Back continues to dismiss instead of leaving the page. A dialog opened by
    // `onClose` (the discard confirmation) pushes it itself, so only push here
    // when nothing did.
    if (anyOpen() && activeToken === undefined) {
        pushPlaceholder();
    }
}

function listen(): void {
    if (!listening) {
        listening = true;
        window.addEventListener('popstate', handlePopState);
    }
}

/**
 * Let the browser Back button dismiss a dialog instead of leaving the page.
 *
 * While any dialog is open the module keeps one placeholder history entry that
 * repeats the current URL, so the router sees no route change and no page has to
 * model its dialogs in the URL. Back pops that entry and closes the newest
 * dialog; nesting and refused dirty closes re-push it, so Back never escapes to
 * the previous page until the dialogs are gone. Closing by any other means
 * (Escape, Cancel, outside press) consumes the entry itself, so Back never needs
 * a second press.
 */
function useDialogHistory(options: DialogHistoryOptions): void {
    const id = ++nextId;
    let pushed = false;
    listen();

    function release(): void {
        const index = stack.findIndex((entry) => entry.id === id);
        if (index !== -1) {
            stack.splice(index, 1);
        }
        if (stack.length === 0 && activeToken !== undefined) {
            activeToken = undefined;
            if (currentToken() !== undefined) {
                window.history.back();
            }
        }
    }

    createEffect(() => {
        if (options.open()) {
            if (!pushed) {
                pushed = true;
                stack.push({ id, options });
                if (activeToken === undefined) {
                    pushPlaceholder();
                }
            }
            return;
        }
        if (pushed) {
            pushed = false;
            release();
        }
    });

    onCleanup(() => {
        if (pushed) {
            pushed = false;
        }
        release();
    });
}

export { useDialogHistory };
