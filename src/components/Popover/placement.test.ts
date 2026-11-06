import { describe, expect, it } from 'vitest';
import { placePopover } from './placement.ts';

const viewport = { left: 8, top: 8, right: 248, bottom: 632 };

describe('popover placement', () => {
    it('opens below the trigger when there is room', () => {
        expect(
            placePopover({
                anchor: { left: 20, top: 100, right: 90, bottom: 132 },
                viewport,
                width: 200,
                height: 256,
                gap: 4,
            })
        ).toEqual({ left: 20, top: 136, side: 'below' });
    });
    it('flips above a trigger near the bottom of the visible viewport', () => {
        expect(
            placePopover({
                anchor: { left: 20, top: 570, right: 90, bottom: 602 },
                viewport,
                width: 200,
                height: 256,
                gap: 4,
            })
        ).toEqual({ left: 20, top: 310, side: 'above' });
    });
    it('keeps a wide menu in the screen while retaining its trigger alignment', () => {
        expect(
            placePopover({
                anchor: { left: 200, top: 100, right: 230, bottom: 132 },
                viewport,
                width: 240,
                height: 160,
                gap: 4,
            })
        ).toEqual({ left: 8, top: 136, side: 'below' });
    });
    it('clamps an oversized menu to the viewport rather than following document scroll', () => {
        expect(
            placePopover({
                anchor: { left: 20, top: -200, right: 80, bottom: -168 },
                viewport,
                width: 240,
                height: 624,
                gap: 4,
            })
        ).toEqual({ left: 8, top: 8, side: 'below' });
    });
});
