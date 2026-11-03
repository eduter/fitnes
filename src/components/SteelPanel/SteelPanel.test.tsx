// @vitest-environment jsdom
import { cleanup, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { SteelPanel } from './SteelPanel.tsx';

describe('SteelPanel', () => {
    afterEach(cleanup);
    it('keeps ordinary content and caller attributes without adding navigation', () => {
        render(() => (
            <SteelPanel class="example" role="region" aria-label="Training">
                <button type="button">Continue</button>
            </SteelPanel>
        ));
        const panel = screen.getByRole('region', { name: 'Training' });
        expect(panel.classList.contains('example')).toBe(true);
        expect(panel.contains(screen.getByRole('button', { name: 'Continue' }))).toBe(true);
        expect(panel.querySelector('nav')).toBeNull();
    });

    it('preserves reactive classes and content', () => {
        const [name, setName] = createSignal('First');
        const [active, setActive] = createSignal(false);
        render(() => (
            <SteelPanel data-testid="panel" class={active() ? 'active' : ''}>
                {name()}
            </SteelPanel>
        ));
        setName('Second');
        setActive(true);
        expect(screen.getByTestId('panel').classList.contains('active')).toBe(true);
        expect(screen.getByTestId('panel').textContent).toBe('Second');
    });

    it('keeps classList flags when class changes and removes disabled classes', () => {
        const [name, setName] = createSignal('first extra');
        const [selected, setSelected] = createSignal(true);
        render(() => (
            <SteelPanel
                data-testid="flags"
                class={name()}
                classList={{ selected: selected(), extra: false, 'badge pair': selected() }}
            />
        ));
        const panel = screen.getByTestId('flags');
        expect(panel.classList.contains('selected')).toBe(true);
        expect(panel.classList.contains('extra')).toBe(false);
        expect(panel.classList.contains('badge')).toBe(true);
        expect(panel.classList.contains('pair')).toBe(true);

        setName('second extra');
        expect(panel.classList.contains('steel-panel')).toBe(true);
        expect(panel.classList.contains('first')).toBe(false);
        expect(panel.classList.contains('second')).toBe(true);
        expect(panel.classList.contains('selected')).toBe(true);
        expect(panel.classList.contains('extra')).toBe(false);

        setSelected(false);
        expect(panel.classList.contains('selected')).toBe(false);
        expect(panel.classList.contains('badge')).toBe(false);
        expect(panel.classList.contains('pair')).toBe(false);
        expect(panel.classList.contains('second')).toBe(true);
        setSelected(true);
        expect(panel.classList.contains('selected')).toBe(true);
    });
});
