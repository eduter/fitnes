/** @vitest-environment jsdom */

import { fireEvent, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { NumberField } from './fields.tsx';

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
