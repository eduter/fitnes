const owners = new Set<object>();
let previous: string | undefined;
/** Suppress browser pull-to-refresh while any active paged window is beyond page one. */
function refreshLock(owner: object, locked: boolean): void {
    if (locked) {
        owners.add(owner);
    } else {
        owners.delete(owner);
    }
    if (owners.size && previous === undefined) {
        previous = document.documentElement.style.overscrollBehaviorY;
        document.documentElement.style.overscrollBehaviorY = 'contain';
    } else if (!owners.size && previous !== undefined) {
        document.documentElement.style.overscrollBehaviorY = previous;
        previous = undefined;
    }
}

export { refreshLock };
