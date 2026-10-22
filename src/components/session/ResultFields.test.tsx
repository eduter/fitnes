/** @vitest-environment jsdom */

import { fireEvent, render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { dumbbellCurl } from '../../domain/examples.ts';
import type { ActualResult } from '../../domain/session.ts';
import { ResultFields } from './ResultFields.tsx';

function curlResult(): ActualResult {
    return {
        sequenceEntryId: 'entry-1',
        measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 10, right: 10 } },
        load: { kind: 'external', basis: 'perSide', weight: { value: 10, unit: 'kg' } },
        completedAt: 2_000,
    };
}

describe('ResultFields', () => {
    it('offers a separate field per side for a per-side exercise', () => {
        const [value, setValue] = createSignal(curlResult());
        const { getByLabelText } = render(() => (
            <ResultFields exercise={dumbbellCurl} value={value()} onChange={setValue} />
        ));

        const left = getByLabelText('Reps left') as HTMLInputElement;
        const right = getByLabelText('Reps right') as HTMLInputElement;
        expect(left.value).toBe('10');
        expect(right.value).toBe('10');

        fireEvent.input(right, { target: { value: '9' } });
        fireEvent.blur(right);

        expect(value().measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 10, right: 9 },
        });
        expect(left.value).toBe('10');
    });

    it('offers a single field for a total-counted exercise', () => {
        const [value, setValue] = createSignal<ActualResult>({
            sequenceEntryId: 'entry-1',
            measurement: { measurement: 'repetitions', countBasis: 'total', reps: 8 },
            load: { kind: 'external', basis: 'total', weight: { value: 40, unit: 'kg' } },
            completedAt: 2_000,
        });
        const { getByLabelText, queryByLabelText } = render(() => (
            <ResultFields exercise={dumbbellCurl} value={value()} onChange={setValue} />
        ));

        expect((getByLabelText('Reps') as HTMLInputElement).value).toBe('8');
        expect(queryByLabelText('Reps left')).toBeNull();
    });

    it('accepts zero for a side, so an injured side can be logged as skipped', () => {
        const [value, setValue] = createSignal(curlResult());
        const { getByLabelText } = render(() => (
            <ResultFields exercise={dumbbellCurl} value={value()} onChange={setValue} />
        ));

        const left = getByLabelText('Reps left') as HTMLInputElement;
        fireEvent.input(left, { target: { value: '0' } });
        fireEvent.blur(left);

        expect(value().measurement).toEqual({
            measurement: 'repetitions',
            countBasis: 'perSide',
            sides: { left: 0, right: 10 },
        });
    });
});
