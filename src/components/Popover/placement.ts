/** Place a menu against its trigger, flipping vertically and clamping to the visible screen. */
function placePopover(input: PlacementInput): PopoverPosition {
    const { anchor, viewport, width, height, gap } = input;
    if (input.placement === 'right') {
        const right = anchor.right + gap;
        const left = anchor.left - gap - width;
        return {
            left: clamp(right + width <= viewport.right ? right : left, viewport.left, viewport.right - width),
            top: clamp((anchor.top + anchor.bottom - height) / 2, viewport.top, viewport.bottom - height),
            side: right + width <= viewport.right ? 'right' : 'left',
        };
    }
    const below = viewport.bottom - anchor.bottom - gap;
    const above = anchor.top - gap - viewport.top;
    const side = below >= height || below >= above ? 'below' : 'above';
    const desiredTop = side === 'below' ? anchor.bottom + gap : anchor.top - gap - height;

    return {
        left: clamp(anchor.left, viewport.left, viewport.right - width),
        top: clamp(desiredTop, viewport.top, viewport.bottom - height),
        side,
    };
}

/** Client-coordinate bounds, independent of document scroll and logical-pixel scaling. */
interface ScreenBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** Sizes and bounds have already been converted to the same client-coordinate space. */
interface PlacementInput {
    anchor: ScreenBounds;
    viewport: ScreenBounds;
    width: number;
    height: number;
    gap: number;
    placement?: 'vertical' | 'right';
}

/** A clamped menu origin and its preferred relationship to the trigger. */
interface PopoverPosition {
    left: number;
    top: number;
    side: 'above' | 'below' | 'right' | 'left';
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

export { placePopover };
