/** @vitest-environment jsdom */

import { fireEvent, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { CompactNumberField, NumberField } from './fields.tsx';

describe('NumberField', () => {
    it('keeps multi-digit input until blur, then commits once', () => {
        const [value, setValue] = createSignal(80);
        const { getByLabelText } = render(() => <NumberField label="Reps" value={value()} onChange={setValue} />);
        const input = getByLabelText('Reps') as HTMLInputElement;

        fireEvent.input(input, { target: { value: '8' } });
        expect(value()).toBe(80);
        expect(input.value).toBe('8');

        fireEvent.input(input, { target: { value: '81' } });
        expect(value()).toBe(80);
        expect(input.value).toBe('81');

        fireEvent.blur(input);
        expect(value()).toBe(81);
    });
});

describe('CompactNumberField', () => {
    it('uses the label as the accessible name instead of a visible label', () => {
        const [value, setValue] = createSignal(8);
        const { getByLabelText } = render(() => (
            <CompactNumberField label="Set 1 reps" value={value()} integer onChange={setValue} />
        ));

        const input = getByLabelText('Set 1 reps') as HTMLInputElement;
        expect(input.value).toBe('8');
        expect(input.getAttribute('inputmode')).toBe('numeric');
    });

    it('asks for the decimal keypad when the value is not an integer count', () => {
        const [value, setValue] = createSignal(45);
        const { getByLabelText } = render(() => (
            <CompactNumberField label="Set 1 seconds" value={value()} onChange={setValue} />
        ));

        expect(getByLabelText('Set 1 seconds').getAttribute('inputmode')).toBe('decimal');
    });

    it('keeps multi-digit input until blur, then commits once', () => {
        const [value, setValue] = createSignal(8);
        const { getByLabelText } = render(() => (
            <CompactNumberField label="Reps" value={value()} integer onChange={setValue} />
        ));
        const input = getByLabelText('Reps') as HTMLInputElement;

        fireEvent.input(input, { target: { value: '1' } });
        fireEvent.input(input, { target: { value: '12' } });
        expect(value()).toBe(8);
        expect(input.value).toBe('12');

        fireEvent.blur(input);
        expect(value()).toBe(12);
    });

    it('restores the last committed value when the entry is not a number', () => {
        const [value, setValue] = createSignal(8);
        const { getByLabelText } = render(() => (
            <CompactNumberField label="Reps" value={value()} integer onChange={setValue} />
        ));
        const input = getByLabelText('Reps') as HTMLInputElement;

        fireEvent.input(input, { target: { value: '' } });
        fireEvent.blur(input);

        expect(value()).toBe(8);
        expect(input.value).toBe('8');
    });
});
