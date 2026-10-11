import { describe, expect, it } from 'vitest';
import { generateId } from './id.ts';

describe('generateId', () => {
    it('returns a unique v4-shaped id', () => {
        const id = generateId();

        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(generateId()).not.toBe(id);
    });
});
