import { describe, expect, it } from 'vitest';
import { rowTemplate } from '../../test/domainFixtures.ts';
import { createSessionFromTemplate } from '../../domain/session.ts';
import { draftResultFromPrescription } from '../../domain/recordSession.ts';
import { currentSet } from './currentSet.ts';

describe('current set', () => {
    it('follows sequence order, rather than the order planned sets are stored', () => {
        const template = rowTemplate();
        template.sequence.reverse();
        const session = createSessionFromTemplate({ template, id: 'session', startedAt: 1 });
        expect(currentSet(session)?.occurrence.entry.id).toBe('entry-2');
        expect(currentSet(session)?.position).toBe(1);
    });

    it('returns to an earlier unlogged occurrence after its result is cleared', () => {
        const template = rowTemplate();
        const session = createSessionFromTemplate({ template, id: 'session', startedAt: 1 });
        const first = draftResultFromPrescription(template.sequence[0]!.id, template.sets[0]!.prescription, 2);
        session.results.push(first);
        expect(currentSet(session)?.occurrence.entry.id).toBe('entry-2');
        session.results = [];
        expect(currentSet(session)?.occurrence.entry.id).toBe('entry-1');
    });

    it('has no current set when every occurrence is logged', () => {
        const template = rowTemplate();
        const session = createSessionFromTemplate({ template, id: 'session', startedAt: 1 });
        session.results = template.sequence.map((entry, index) =>
            draftResultFromPrescription(entry.id, template.sets[index]!.prescription, 2)
        );
        expect(currentSet(session)).toBeUndefined();
    });
});
