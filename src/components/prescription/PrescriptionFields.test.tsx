import { draftResultFromPrescription } from '../../domain/recordSession.ts';
import { sequenceEntryId } from '../../domain/ids.ts';
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it } from 'vitest';
import { AppDataProvider } from '../../app/AppData.tsx';
import { defaultPrescription } from '../../domain/defaultPrescription.ts';
import { airSquat, dumbbellCurl, pullUp } from '../../domain/examples.ts';
import type { ExerciseDefinition } from '../../domain/exercise.ts';
import { PrescriptionFields } from './PrescriptionFields.tsx';

afterEach(cleanup);

function renderFields(exercise: ExerciseDefinition) {
    const [value, setValue] = createSignal(defaultPrescription(exercise));
    render(() => (
        <AppDataProvider>
            <PrescriptionFields exercise={exercise} value={value()} onChange={setValue} />
        </AppDataProvider>
    ));
    return value;
}

it('edits unweighted and weighted pull-ups with one added-weight field and no fixed-property selectors', () => {
    const value = renderFields(pullUp);
    expect(screen.getByRole('button', { name: 'Increase Reps' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Unit:/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Sides|Movement|Execution mode|Load|Load basis):/ })).toBeNull();
    expect(value().load).toEqual({ kind: 'bodyweightExternal', weight: { value: 0, unit: 'kg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Increase Added weight (kg)' }));
    expect(value().load).toEqual({ kind: 'bodyweightExternal', weight: { value: 1, unit: 'kg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Added weight (kg)' }));
    expect(value().load).toEqual({ kind: 'bodyweightExternal', weight: { value: 0, unit: 'kg' } });
});

it('applies targets to each side without a counting-basis choice', () => {
    const value = renderFields(dumbbellCurl);
    fireEvent.click(screen.getByRole('button', { name: 'Increase Reps per side' }));
    expect(value().measurement).toEqual({ measurement: 'repetitions', countBasis: 'perSide', reps: 9 });
    expect(value().executionMode).toBe('unilateral');
});

it('offers Unit only when there is a choice and preserves the selected quantity', () => {
    const value = renderFields({ ...airSquat, measurements: ['repetitions', 'duration'] });
    fireEvent.click(screen.getByRole('button', { name: 'Unit: Reps' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose Unit' });
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'Seconds', exact: true }));
    expect(value().measurement).toEqual({ measurement: 'duration', countBasis: 'total', seconds: 30 });
    expect(screen.queryByRole('button', { name: 'Increase Added weight (kg)' })).toBeNull();
});

it('changes counting with the set sides selection and accepts assistance', () => {
    const value = renderFields({ ...pullUp, executionModes: ['bilateral', 'unilateral'] });
    fireEvent.click(screen.getByRole('button', { name: 'Sides: Both sides' }));
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Choose Sides' }));
    fireEvent.click(screen.getByRole('button', { name: 'One side', exact: true }));
    expect(value().executionMode).toBe('unilateral');
    expect(value().measurement.countBasis).toBe('perSide');
    expect(draftResultFromPrescription(sequenceEntryId.assert('entry-1'), value(), 1).measurement).toEqual({
        measurement: 'repetitions',
        countBasis: 'perSide',
        sides: { left: 8, right: 8 },
    });
    expect(screen.getByRole('button', { name: 'Increase Reps per side' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Added weight (kg)' }));
    expect(value().load).toEqual({ kind: 'bodyweightExternal', weight: { value: -1, unit: 'kg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sides: One side' }));
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Choose Sides' }));
    fireEvent.click(screen.getByRole('button', { name: 'Both sides', exact: true }));
    expect(draftResultFromPrescription(sequenceEntryId.assert('entry-1'), value(), 1).measurement).toEqual({
        measurement: 'repetitions',
        countBasis: 'total',
        reps: 8,
    });
});
