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

it('locks browser refresh only after the first page and restores it on cleanup', () => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true }))
    );
    const original = document.documentElement.style.overscrollBehaviorY;
    const [page, setPage] = createSignal(1);
    const view = render(() => (
        <PagedWindow label="Refresh" page={page()} count={2} onChange={setPage}>
            <p>Content</p>
        </PagedWindow>
    ));
    expect(document.documentElement.style.overscrollBehaviorY).toBe(original);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(document.documentElement.style.overscrollBehaviorY).toBe('contain');
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(document.documentElement.style.overscrollBehaviorY).toBe(original);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    view.unmount();
    expect(document.documentElement.style.overscrollBehaviorY).toBe(original);
});

it('rejects pagination inside a dialog', () => {
    expect(() =>
        render(() => (
            <div role="dialog" aria-label="Invalid editor">
                <PagedWindow label="Invalid pages" page={1} count={2} onChange={() => undefined}>
                    <p>Fields</p>
                </PagedWindow>
            </div>
        ))
    ).toThrow('PagedWindow cannot be used inside a dialog');
});
