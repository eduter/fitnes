/** Logical picture width. One row is 32 tiles of 8 pixels, the NES screen width. */
const LOGICAL_WIDTH = 256;

/**
 * How a 256-pixel-wide column fits the device.
 * Height is not part of this: a page grows with its content and scrolls.
 */
interface NesScale {
    /** CSS pixels per logical pixel. An integer number of device pixels, except when the viewport is narrower than 256. */
    px: number;
    /** Column width in CSS pixels. */
    screen: number;
    /** Black letterbox on the left, in CSS pixels. The right side keeps whatever remainder is left. */
    left: number;
}

/**
 * Largest scale that fits `viewportCssWidth` with each logical pixel landing
 * on a whole device pixel. Width is the only input; a taller page uses the
 * same scale and scrolls.
 */
function nesScale(viewportCssWidth: number, devicePixelRatio: number): NesScale {
    const width = viewportCssWidth > 0 ? viewportCssWidth : LOGICAL_WIDTH;
    const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
    const deviceWidth = width * dpr;

    // A window narrower than one logical screen cannot use an integer scale
    if (deviceWidth < LOGICAL_WIDTH) {
        return { px: width / LOGICAL_WIDTH, screen: width, left: 0 };
    }

    const integer = Math.floor(deviceWidth / LOGICAL_WIDTH);
    const px = integer / dpr;
    const screen = LOGICAL_WIDTH * px;
    const leftDevice = Math.floor((deviceWidth - LOGICAL_WIDTH * integer) / 2);

    return { px, screen, left: leftDevice / dpr };
}

/** Write the scale onto the document so CSS can size the column. */
function applyNesScale(): void {
    const scale = nesScale(document.documentElement.clientWidth, window.devicePixelRatio);
    const root = document.documentElement.style;
    root.setProperty('--px', `${scale.px}px`);
    root.setProperty('--screen', `${scale.screen}px`);
    root.setProperty('--screen-left', `${scale.left}px`);
}

export type { NesScale };
export { applyNesScale, LOGICAL_WIDTH, nesScale };
