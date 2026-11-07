/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { CompactNumberField, NumberField } from './fields.tsx';

afterEach(cleanup);

describe('quantity fields', () => {
    it('uses the adopted spinner to apply fractional equipment increments immediately', () => {
        const [value, setValue] = createSignal(40);
        const view = render(() => <CompactNumberField label="Row weight" value={value()} onChange={setValue} />);
        fireEvent.click(view.getByRole('button', { name: 'Increase Row weight' }));
        expect(value()).toBe(40.25);
        expect(view.getByRole('button', { name: /Row weight: 040.25. Edit number/ })).toBeTruthy();
    });

    it('keeps integer reps and respects their lower bound', () => {
        const [value, setValue] = createSignal(1);
        const view = render(() => <NumberField label="Reps" value={value()} min={1} step={1} onChange={setValue} />);
        expect((view.getByRole('button', { name: 'Decrease Reps' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(view.getByRole('button', { name: 'Increase Reps' }));
        expect(value()).toBe(2);
    });
});
