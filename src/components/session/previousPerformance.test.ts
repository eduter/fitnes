import { describe, expect, it } from 'vitest';
import { createSessionFromTemplate, type WorkoutSession } from '../../domain/session.ts';
import { rowTemplate } from '../../test/domainFixtures.ts';
import { previousPerformance } from './previousPerformance.ts';

/** Start a session from the two-set row template at `startedAt`. */
function sessionAt(id: string, startedAt: number): WorkoutSession {
    return createSessionFromTemplate({ id, template: rowTemplate(), startedAt });
}

/** Record the same result for every set the session prescribes. */
function logAll(session: WorkoutSession, result: (index: number) => WorkoutSession['results'][number]): WorkoutSession {
    return {
        ...session,
        completedAt: session.startedAt + 3_600_000,
        results: session.snapshot.sequence.map((_entry, index) => result(index)),
    };
}

function result(entryId: string, reps: number, weight: number): WorkoutSession['results'][number] {
    return {
        sequenceEntryId: entryId,
        measurement: { measurement: 'repetitions', countBasis: 'total', reps },
        load: { kind: 'external', basis: 'total', weight: { value: weight, unit: 'kg' } },
        completedAt: 1_000,
    };
}

describe('previousPerformance', () => {
    it('finds the matching set from the most recent earlier session', () => {
        const older = logAll(sessionAt('sess-old', 1_000), (index) => result(`entry-${index + 1}`, 5, 30));
        const newer = logAll(sessionAt('sess-new', 2_000), (index) => result(`entry-${index + 1}`, 6, 40));
        const current = sessionAt('sess-current', 3_000);

        const previous = previousPerformance(current, [older, newer, current]);

        expect(previous['entry-1']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 6 });
        expect(previous['entry-2']?.load).toEqual({
            kind: 'external',
            basis: 'total',
            weight: { value: 40, unit: 'kg' },
        });
    });

    it('matches sets by position within the exercise, not by sequence index', () => {
        const earlier = logAll(sessionAt('sess-earlier', 1_000), (index) =>
            result(`entry-${index + 1}`, 8 + index, 40)
        );
        const current = sessionAt('sess-current', 2_000);

        const previous = previousPerformance(current, [earlier, current]);

        expect(previous['entry-1']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 8 });
        expect(previous['entry-2']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 9 });
    });

    it('ignores sessions that started after the current one', () => {
        const later = logAll(sessionAt('sess-later', 5_000), (index) => result(`entry-${index + 1}`, 12, 50));
        const current = sessionAt('sess-current', 2_000);

        expect(previousPerformance(current, [later, current])).toEqual({});
    });

    it('ignores a session that logged no results for the exercise', () => {
        const empty = sessionAt('sess-empty', 1_000);
        const current = sessionAt('sess-current', 2_000);

        expect(previousPerformance(current, [empty, current])).toEqual({});
    });

    it('ignores an in-progress session, which has not fixed its numbers yet', () => {
        const inProgress = sessionAt('sess-open', 1_000);
        const current = sessionAt('sess-current', 2_000);

        expect(previousPerformance(current, [inProgress, current])).toEqual({});
    });

    it('falls back to the last recorded set when the earlier session was shorter', () => {
        const shorter = logAll(sessionAt('sess-short', 1_000), (index) => result(`entry-${index + 1}`, 8 + index, 40));
        const extended = {
            ...rowTemplate(),
            sets: [
                ...rowTemplate().sets,
                {
                    id: 'set-3',
                    exerciseId: 'ex-bent-over-row',
                    prescription: structuredClone(rowTemplate().sets[0]!.prescription),
                },
            ],
            sequence: [...rowTemplate().sequence, { id: 'entry-3', plannedSetId: 'set-3' }],
        };
        const current = createSessionFromTemplate({ id: 'sess-current', template: extended, startedAt: 2_000 });

        const previous = previousPerformance(current, [shorter, current]);

        expect(previous['entry-1']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 8 });
        expect(previous['entry-2']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 9 });
        expect(previous['entry-3']?.measurement).toEqual({ measurement: 'repetitions', countBasis: 'total', reps: 9 });
    });

    it('does not confuse a second exercise in the same session with the first', () => {
        const current = sessionAt('sess-current', 2_000);

        expect(previousPerformance(current, [current])).toEqual({});
    });
});
