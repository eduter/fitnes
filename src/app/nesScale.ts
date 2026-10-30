/** Snap each logical pixel to whole device pixels, including the column's origin. */
function applyNesScale(): void {
    const ratio = window.devicePixelRatio || 1;
    const available = Math.min(window.innerWidth, 512);
    const pixels = Math.max(1, Math.floor((available * ratio) / 256));
    const scale = pixels / ratio;
    const left = Math.floor((window.innerWidth * ratio - 256 * pixels) / 2) / ratio;

    document.documentElement.style.setProperty('--scale', String(scale));
    document.documentElement.style.setProperty('--column-left', `${Math.max(0, left)}px`);
    const remainder = (window.innerHeight * ratio) % pixels;
    document.documentElement.style.setProperty('--nav-shift', `${-remainder / ratio}px`);
    syncNesHeight();
}

/** Transforms preserve the grid but do not change flow height, so reserve that height explicitly. */
function syncNesHeight(): void {
    const root = document.getElementById('root');
    if (!root) {
        return;
    }

    const scale = Number(document.documentElement.style.getPropertyValue('--scale')) || 1;
    document.body.style.minHeight = `${Math.ceil(root.scrollHeight * scale)}px`;
}

export { applyNesScale, syncNesHeight };
