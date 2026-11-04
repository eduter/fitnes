// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { SteelPopoverPreview } from './SteelPopoverPreview.tsx';

afterEach(cleanup);

describe('SteelPopoverPreview', () => {
    it('keeps the panel visible until the reversed closing animation finishes and restores focus', () => {
        render(() => <SteelPopoverPreview />);
        const opener = screen.getByRole('button', { name: 'Open popover' });
        fireEvent.click(opener);
        const panel = screen.getByRole('dialog', { name: 'Steel popover' });
        expect(panel.dataset.phase).toBe('opening');
        fireEvent.animationEnd(panel);
        const close = screen.getByRole('button', { name: 'Close popover' });
        expect(document.activeElement).toBe(close);

        fireEvent.click(close);
        expect(panel.dataset.phase).toBe('closing');
        expect(panel.hidden).toBe(false);
        expect(opener.getAttribute('aria-expanded')).toBe('true');
        fireEvent.animationEnd(panel);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(opener.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(opener);
    });

    it('lets Escape close the panel and ignores animation events from children', () => {
        render(() => <SteelPopoverPreview />);
        fireEvent.click(screen.getByRole('button', { name: 'Open popover' }));
        const panel = screen.getByRole('dialog');
        fireEvent.animationEnd(screen.getByRole('heading', { name: 'Steel popover' }));
        expect(panel.dataset.phase).toBe('opening');
        fireEvent.animationEnd(panel);
        fireEvent.keyDown(screen.getByRole('button', { name: 'Close popover' }), { key: 'Escape' });
        expect(panel.dataset.phase).toBe('closing');
        fireEvent.animationEnd(panel);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('offers 3px and 16px presets and holds their settings until the popover closes', () => {
        render(() => <SteelPopoverPreview />);
        const chunky = screen.getByRole('button', { name: '16px' });
        const preview = screen.getByRole('main');
        expect(chunky.getAttribute('aria-pressed')).toBe('true');
        expect(preview.style.getPropertyValue('--reveal-steps')).toBe('6');
        expect(preview.style.getPropertyValue('--reveal-duration')).toBe('200ms');
        fireEvent.click(screen.getByRole('button', { name: '3px' }));
        expect(preview.style.getPropertyValue('--reveal-steps')).toBe('32');
        fireEvent.click(chunky);
        fireEvent.click(screen.getByRole('button', { name: '1 frame' }));
        expect(preview.style.getPropertyValue('--reveal-duration')).toBe('100ms');
        fireEvent.click(screen.getByRole('button', { name: '2 frames' }));
        expect(preview.style.getPropertyValue('--reveal-duration')).toBe('200ms');
        fireEvent.click(screen.getByRole('button', { name: 'Open popover' }));
        expect(chunky.matches(':disabled')).toBe(true);
        fireEvent.animationEnd(screen.getByRole('dialog'));
        fireEvent.click(screen.getByRole('button', { name: 'Close popover' }));
        fireEvent.animationEnd(screen.getByRole('dialog'));
        expect(chunky.matches(':disabled')).toBe(false);
    });
});
