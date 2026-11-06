const layers: HTMLElement[] = [];
const original = new Map<HTMLElement, boolean>();

/** Keep only the uppermost overlay interactive while preserving underlying windows. */
function pushModal(layer: HTMLElement): void {
    if (!layers.includes(layer)) {
        layers.push(layer);
    }
    refresh();
}

/** Restore the parent window when its child closes, or the page after the last window. */
function popModal(layer: HTMLElement): void {
    const index = layers.indexOf(layer);
    if (index >= 0) {
        layers.splice(index, 1);
    }
    refresh();
}

function refresh(): void {
    for (const [element, inert] of original) {
        element.toggleAttribute('inert', inert);
    }
    original.clear();
    let active = layers.at(-1);
    while (active?.parentElement) {
        for (const sibling of active.parentElement.children) {
            if (sibling !== active && sibling instanceof HTMLElement) {
                original.set(sibling, sibling.hasAttribute('inert'));
                sibling.setAttribute('inert', '');
            }
        }
        active = active.parentElement;
    }
}

/** Whether this window owns outside dismissal. */
function isTopModal(layer: HTMLElement): boolean {
    return layers.at(-1) === layer;
}

export { isTopModal, popModal, pushModal };
