/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { findOccurrence } from '../../domain/lookups.ts';
import { draftResultFromPrescription } from '../../domain/recordSession.ts';
import { rowTemplate } from '../../test/domainFixtures.ts';
import { GuidedSession } from './GuidedSession.tsx';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function setup(perSide = false, saves = true, reps = 8) {
    const plan = rowTemplate();
    if (perSide) {
        plan.sets[0].prescription.measurement = { measurement: 'repetitions', countBasis: 'perSide', reps: 8 };
    }
    plan.sets[0].prescription.measurement = {
        measurement: 'repetitions',
        countBasis: perSide ? 'perSide' : 'total',
        reps,
    };
    const entry = plan.sequence[0];
    const draft = draftResultFromPrescription(entry.id, plan.sets[0].prescription, 1);
    const onLog = vi.fn(async () => saves);
    render(() => (
        <GuidedSession
            sessionId="session"
            entry={entry}
            occurrence={findOccurrence(plan, entry.id)}
            draft={draft}
            index={0}
            count={2}
            unit="kg"
            onLog={onLog}
            onReview={() => {}}
            onComplete={() => {}}
            onDelete={() => {}}
        />
    ));
    return { onLog, draft };
}

it('keeps the step and editable performance when saving fails', async () => {
    const { onLog, draft } = setup(false, false);
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await screen.findByText('Could not save. Try Log again.');
    expect(onLog).toHaveBeenCalledWith(draft);
    expect(screen.getByRole('heading', { name: 'Bent-over row' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log', exact: true }).hasAttribute('disabled')).toBe(false);
    expect(localStorage.getItem(`fitnes-guided:session:${draft.sequenceEntryId}`)).not.toBeNull();
});

it('guides sides independently before saving one result with both side values and its original load', async () => {
    const { onLog, draft } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    expect(onLog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(onLog).toHaveBeenCalledWith(draft));
    await waitFor(() => expect(localStorage.getItem(`fitnes-guided:session:${draft.sequenceEntryId}`)).toBeNull());
});

it('keeps large imported performance loggable beyond the keypad capacity', async () => {
    const { onLog, draft } = setup(false, true, 100000);
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(onLog).toHaveBeenCalledWith(draft));
});
