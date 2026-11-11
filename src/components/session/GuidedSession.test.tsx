/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { findOccurrence } from '../../domain/lookups.ts';
import { draftResultFromPrescription } from '../../domain/recordSession.ts';
import { rowTemplate } from '../../test/domainFixtures.ts';
import { GuidedSession } from './GuidedSession.tsx';

beforeEach(() => localStorage.clear());
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function setup(perSide = false, saves = true, reps = 8, unilateral = false, timed = false) {
    const plan = rowTemplate();
    if (perSide) {
        plan.sets[0].prescription.measurement = { measurement: 'repetitions', countBasis: 'perSide', reps: 8 };
    }
    plan.sets[0].prescription.measurement = {
        measurement: 'repetitions',
        countBasis: perSide ? 'perSide' : 'total',
        reps,
    };
    if (timed) {
        plan.sets[0].prescription.measurement = { measurement: 'duration', countBasis: 'total', seconds: reps };
    }
    if (unilateral) {
        plan.sets[0].prescription.executionMode = 'unilateral';
    }
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
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await screen.findByText('Could not save. Try Log again.');
    expect(onLog).toHaveBeenCalledWith(draft);
    expect(screen.getByRole('heading', { name: 'Bent-over row' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log', exact: true }).hasAttribute('disabled')).toBe(false);
    expect(localStorage.getItem(`fitnes-guided:session:${draft.sequenceEntryId}`)).not.toBeNull();
});

it('guides sides independently before saving one result with both side values and its original load', async () => {
    const { onLog, draft } = setup(true);
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    expect(onLog).not.toHaveBeenCalled();
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(onLog).toHaveBeenCalledWith(draft));
    await waitFor(() => expect(localStorage.getItem(`fitnes-guided:session:${draft.sequenceEntryId}`)).toBeNull());
});

it('keeps large imported performance loggable beyond the keypad capacity', async () => {
    const { onLog, draft } = setup(false, true, 100000);
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(onLog).toHaveBeenCalledWith(draft));
});

it('preserves a right-side correction made before switching sides and refreshing', async () => {
    const { draft } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'More', exact: true }));
    const menu = await screen.findByRole('dialog', { name: 'Workout actions' });
    fireEvent.animationEnd(menu);
    fireEvent.click(within(menu).getByRole('button', { name: 'Result', exact: true }));
    const editor = await screen.findByRole('dialog', { name: 'Edit result' });
    fireEvent.animationEnd(menu);
    fireEvent.animationEnd(editor);
    fireEvent.click(within(editor).getByRole('button', { name: 'Decrease Actual right' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'End', exact: true }));
    fireEvent.animationEnd(editor);
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    cleanup();

    const { onLog } = setup(true);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    now += 8000;
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await confirmEarlyLog('Log Left: 8 of 8 reps; Right: 7 of 8 reps?');
    await waitFor(() =>
        expect(onLog).toHaveBeenCalledWith({
            ...draft,
            measurement: { measurement: 'repetitions', countBasis: 'perSide', sides: { left: 8, right: 7 } },
        })
    );
});

it('guides unilateral total-counted sets left then right before advancing', async () => {
    const { onLog, draft } = setup(false, true, 8, true);
    expect(screen.getByText('Left')).toBeTruthy();
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByText('Right')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('0/8');
    cleanup();

    const resumed = setup(false, true, 8, true);
    expect(screen.getByText('Right')).toBeTruthy();
    startSet();
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await waitFor(() => expect(resumed.onLog).toHaveBeenCalledWith(draft));
});

it('restarts the preparation and rep counter for the right side', async () => {
    const { onLog } = setup(false, true, 2, true);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    now += 11000;
    await screen.findByText('Set complete · Left');
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole('timer').textContent).toBe('0/2');
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    expect(screen.getByText('Get into position · Right')).toBeTruthy();
    now += 8000;
    await screen.findByText('Reps completed · Right');
    expect(screen.getByRole('timer').textContent).toBe('1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await confirmEarlyLog('Log Right: 1 of 2 reps?');
    await waitFor(() =>
        expect(onLog).toHaveBeenCalledWith(
            expect.objectContaining({
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 1 },
            })
        )
    );
});

it('skips a unilateral set without requiring a second side', async () => {
    const { onLog } = setup(false, true, 8, true);
    fireEvent.click(screen.getByRole('button', { name: 'Skip', exact: true }));
    await waitFor(() =>
        expect(onLog).toHaveBeenCalledWith(
            expect.objectContaining({
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 0 },
            })
        )
    );
});

function startSet(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 400000000);
}

it('prevents logging or advancing a side before Start, including after Reset', () => {
    const { onLog } = setup(true);
    const next = screen.getByRole('button', { name: 'Next side', exact: true });
    expect(next.hasAttribute('disabled')).toBe(true);
    fireEvent.click(next);
    expect(screen.getByText('Left')).toBeTruthy();
    expect(onLog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset', exact: true }));
    expect(next.hasAttribute('disabled')).toBe(true);
});

it('confirms the exact early rep count and freezes it until Yes', async () => {
    const { onLog } = setup(false, true, 20);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    now += 35000;
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Log 10 of 20 reps?' });
    fireEvent.animationEnd(dialog);
    expect(onLog).not.toHaveBeenCalled();
    now += 60000;
    expect(dialog.textContent).toContain('Log 10 of 20 reps?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes', exact: true }));
    await waitFor(() =>
        expect(onLog).toHaveBeenCalledWith(
            expect.objectContaining({
                measurement: { measurement: 'repetitions', countBasis: 'total', reps: 10 },
            })
        )
    );
});

it('cancels an accidental Log and resumes counting without retaining the proposed count', async () => {
    const { onLog } = setup(false, true, 20);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    now += 35000;
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Log 10 of 20 reps?' });
    fireEvent.animationEnd(dialog);
    now += 30000;
    fireEvent.click(within(dialog).getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(dialog);
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause', exact: true })).toBeTruthy();
    now += 3000;
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    await screen.findByRole('dialog', { name: 'Log 11 of 20 reps?' });
});

it('confirms zero during preparation and leaves an already-paused set paused on Escape', async () => {
    const { onLog } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Log 0 of 8 reps?' });
    fireEvent.animationEnd(dialog);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.animationEnd(dialog);
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Resume', exact: true })).toBeTruthy();
});

it('confirms elapsed work seconds without counting preparation', async () => {
    const { onLog } = setup(false, true, 60, false, true);
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    now += 15500;
    fireEvent.click(screen.getByRole('button', { name: 'Log', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Log 10 of 60 seconds?' });
    fireEvent.animationEnd(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes', exact: true }));
    await waitFor(() =>
        expect(onLog).toHaveBeenCalledWith(
            expect.objectContaining({
                measurement: { measurement: 'duration', countBasis: 'total', seconds: 10 },
            })
        )
    );
});

it('confirms an early side transition before moving to Right', async () => {
    const { onLog } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Next side', exact: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Log Left: 0 of 8 reps and go to Right?' });
    fireEvent.animationEnd(dialog);
    expect(screen.queryByText('Right', { exact: true })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes', exact: true }));
    expect(screen.getByText('Right', { exact: true })).toBeTruthy();
    expect(onLog).not.toHaveBeenCalled();
});

async function confirmEarlyLog(message: string): Promise<void> {
    const dialog = await screen.findByRole('dialog', { name: message });
    fireEvent.animationEnd(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes', exact: true }));
    fireEvent.animationEnd(dialog);
}
