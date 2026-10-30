import { describe, expect, it } from 'vitest';
import { primaryNavItems, secondaryNavItems } from './navigation.ts';

describe('navigation', () => {
    it('orders primary destinations by how often they are used', () => {
        expect(primaryNavItems.map((item) => item.label)).toEqual([
            'Home',
            'Templates',
            'Exercises',
            'Weight',
            'History',
        ]);
    });

    it('keeps every primary destination reachable in the thumb zone', () => {
        for (const item of primaryNavItems) {
            expect(item.href.startsWith('/')).toBe(true);
        }
    });

    it('keeps the rare destinations out of the bottom bar', () => {
        expect(secondaryNavItems.map((item) => item.label)).toEqual(['Data']);
    });

    it('has no destination in both bars', () => {
        const primary = new Set(primaryNavItems.map((item) => item.href));
        const overlap = secondaryNavItems.filter((item) => primary.has(item.href));

        expect(overlap).toEqual([]);
    });
});
