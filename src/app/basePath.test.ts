import { describe, expect, it } from 'vitest';
import { pathWithinBase } from './basePath.ts';

describe('pathWithinBase', () => {
    it('leaves the pathname untouched at the domain root', () => {
        expect(pathWithinBase('/', '/')).toBe('/');
        expect(pathWithinBase('/templates', '/')).toBe('/templates');
    });

    it('strips a project-site base so route matching sees the app-relative path', () => {
        expect(pathWithinBase('/fitnes/', '/fitnes')).toBe('/');
        expect(pathWithinBase('/fitnes', '/fitnes')).toBe('/');
        expect(pathWithinBase('/fitnes/templates', '/fitnes')).toBe('/templates');
        expect(pathWithinBase('/fitnes/sessions/42', '/fitnes')).toBe('/sessions/42');
    });

    it('ignores a base that does not prefix the pathname', () => {
        expect(pathWithinBase('/templates', '/fitnes')).toBe('/templates');
    });

    it('tolerates a missing base', () => {
        expect(pathWithinBase('/templates', undefined)).toBe('/templates');
    });
});
