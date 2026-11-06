// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { afterEach, expect, it, vi } from 'vitest';
import { PagedWindow } from './PagedWindow.tsx';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
it('blacks out before changing page and blocks repeated navigation during redraw', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false }))
    );
    const [page, setPage] = createSignal(1);
    render(() => (
        <PagedWindow label="Pages" page={page()} count={3} onChange={setPage}>
            <p>{page()}</p>
        </PagedWindow>
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('region', { name: 'Pages' }).hasAttribute('data-redrawing')).toBe(true);
    expect(page()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    vi.advanceTimersByTime(80);
    expect(page()).toBe(2);
    expect(screen.getByRole('region', { name: 'Pages' }).hasAttribute('data-redrawing')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    vi.advanceTimersByTime(80);
    expect(page()).toBe(1);
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(true);
});
