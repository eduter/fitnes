/** @vitest-environment jsdom */

import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { PixelIcon, PixelPanel } from './index.ts';

describe('PixelIcon', () => {
    it('is decorative when its surrounding control provides the label', () => {
        const { container } = render(() => <PixelIcon name="dumbbell" />);
        const icon = container.querySelector('img');

        expect(icon?.getAttribute('src')).toBe('/pixel-icons/dumbbell.png');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('can be labeled when it conveys meaning on its own', () => {
        const { getByRole } = render(() => <PixelIcon name="trophy" label="Personal record" />);

        expect(getByRole('img', { name: 'Personal record' })).toBeTruthy();
    });
});

describe('PixelPanel', () => {
    it('renders a titled panel with its requested treatment', () => {
        const { getByRole } = render(() => (
            <PixelPanel title="Next workout" variant="highlight">
                Upper body
            </PixelPanel>
        ));

        const heading = getByRole('heading', { name: 'Next workout' });
        expect(heading).toBeTruthy();
        expect(heading.closest('section')?.classList.contains('pixel-panel--highlight')).toBe(true);
    });
});
