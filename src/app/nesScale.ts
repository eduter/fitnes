/** Logical picture width. One row is 32 tiles of 8 pixels, the NES screen width. */
const LOGICAL_WIDTH = 256;

/**
 * How a 256-pixel-wide column fits the device.
 * Height is not part of this: a page grows with its content and scrolls.
 */
interface NesScale {
    /** CSS pixels per logical pixel. The column always fills the viewport width. */
    px: number;
    /** Column width in CSS pixels. Equal to the viewport. */
    screen: number;
    /** Left offset in CSS pixels. Zero, because the column uses the full width. */
    left: number;
}

/**
 * Scale the 256-pixel column so it fills `viewportCssWidth` exactly.
 * Width is the only input; a taller page uses the same scale and scrolls.
 */
function nesScale(viewportCssWidth: number): NesScale {
    const width = viewportCssWidth > 0 ? viewportCssWidth : LOGICAL_WIDTH;

    return { px: width / LOGICAL_WIDTH, screen: width, left: 0 };
}

/** Write the scale onto the document so CSS can size the column. */
function applyNesScale(): void {
    const scale = nesScale(document.documentElement.clientWidth);
    const root = document.documentElement.style;
    root.setProperty('--px', `${scale.px}px`);
    root.setProperty('--screen', `${scale.screen}px`);
    root.setProperty('--screen-left', `${scale.left}px`);
}

export type { NesScale };
export { applyNesScale, LOGICAL_WIDTH, nesScale };
