/** @vitest-environment jsdom */
import { MemoryRouter, Route, type LocationChange, type MemoryHistory, useLocation } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import type { JSX } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';
import { BottomTabs } from '../components/BottomTabs/BottomTabs.tsx';
import { useActiveTab, useAppNavigate, useIsHome } from './navigation.ts';

interface HistorySnapshot {
    path: string;
    stack: string[];
    atRoot: boolean;
}

function createInspectableHistory(initialPath: string): {
    history: MemoryHistory;
    snapshot: () => HistorySnapshot;
} {
    const entries = [initialPath];
    let index = 0;
    const listeners: Array<(value: string) => void> = [];

    function currentPath(): string {
        return entries[index] ?? initialPath;
    }

    function notify(): void {
        const value = currentPath();
        for (const listener of listeners) {
            listener(value);
        }
    }

    const history: MemoryHistory = {
        get: () => currentPath(),
        set: ({ value, replace }: LocationChange) => {
            if (replace) {
                entries[index] = value;
            } else {
                entries.splice(index + 1, entries.length - index, value);
                index++;
            }
            notify();
        },
        go: (n: number) => {
            index = Math.max(0, Math.min(index + n, entries.length - 1));
            notify();
        },
        listen: (listener: (value: string) => void) => {
            listeners.push(listener);
            return () => {
                const at = listeners.indexOf(listener);
                if (at !== -1) {
                    listeners.splice(at, 1);
                }
            };
        },
    };

    return {
        history,
        snapshot: () => ({
            path: currentPath(),
            stack: entries.slice(0, index + 1),
            atRoot: index === 0,
        }),
    };
}

function EmptyPage() {
    return null;
}

function HistoryHarness(props: { children?: JSX.Element }): JSX.Element {
    const nav = useAppNavigate();
    const location = useLocation();
    const activeTab = useActiveTab();
    const home = useIsHome();

    return (
        <div>
            <span data-testid="path">{`${location.pathname}${location.search}`}</span>
            <span data-testid="tab">{activeTab()}</span>
            <span data-testid="home">{String(home())}</span>
            <BottomTabs active={activeTab()} onSelect={(tab) => nav.toTab(tab)} />
            {props.children}
            <button type="button" onClick={() => nav.toWorkoutPicker()}>
                Start workout
            </button>
            <button type="button" onClick={() => nav.toWorkout('tpl-1')}>
                Open workout
            </button>
            <button type="button" onClick={() => nav.toStartSession('tpl-1')}>
                Start template
            </button>
            <button type="button" onClick={() => nav.replaceSession('sess-1')}>
                Begin session
            </button>
            <button type="button" onClick={() => nav.goBack()}>
                Back
            </button>
            <button type="button" onClick={() => nav.toHistoryList()}>
                History list
            </button>
        </div>
    );
}

function renderApp(initialPath = '/') {
    const inspectable = createInspectableHistory(initialPath);
    const view = render(() => (
        <MemoryRouter history={inspectable.history} root={HistoryHarness}>
            <Route path="/" component={EmptyPage} />
            <Route path="/workouts" component={EmptyPage} />
            <Route path="/templates" component={EmptyPage} />
            <Route path="/templates/new" component={EmptyPage} />
            <Route path="/templates/:id" component={EmptyPage} />
            <Route path="/sessions" component={EmptyPage} />
            <Route path="/sessions/start/:templateId" component={EmptyPage} />
            <Route path="/sessions/:id" component={EmptyPage} />
            <Route path="/bodyweight" component={EmptyPage} />
            <Route path="/data" component={EmptyPage} />
        </MemoryRouter>
    ));
    return { ...view, inspectable };
}

async function pathIs(expected: string): Promise<void> {
    await waitFor(() => {
        expect(screen.getByTestId('path').textContent).toBe(expected);
    });
}

afterEach(cleanup);

describe('tab history', () => {
    it('keeps a single history entry when switching tabs', async () => {
        const { inspectable } = renderApp('/');

        fireEvent.click(screen.getByRole('button', { name: 'Workouts' }));
        await pathIs('/templates');
        expect(inspectable.snapshot()).toEqual({ path: '/templates', stack: ['/templates'], atRoot: true });

        fireEvent.click(screen.getByRole('button', { name: 'History' }));
        await pathIs('/sessions');
        expect(inspectable.snapshot().atRoot).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Home' }));
        await pathIs('/');
        expect(inspectable.snapshot()).toEqual({ path: '/', stack: ['/'], atRoot: true });
    });
});

describe('active tab and home', () => {
    it('derives the destination from a nested path', async () => {
        renderApp('/templates/tpl-1');
        await pathIs('/templates/tpl-1');
        expect(screen.getByTestId('tab').textContent).toBe('templates');
        expect(screen.getByTestId('home').textContent).toBe('false');
    });

    it('marks Home only on the root path', async () => {
        renderApp('/');
        await pathIs('/');
        expect(screen.getByTestId('home').textContent).toBe('true');
    });
});

describe('detail history', () => {
    it('pushes a workout detail and pops it back to the Workouts tab', async () => {
        const { inspectable } = renderApp('/templates');

        fireEvent.click(screen.getByRole('button', { name: 'Open workout' }));
        await pathIs('/templates/tpl-1');
        expect(inspectable.snapshot()).toEqual({
            path: '/templates/tpl-1',
            stack: ['/templates', '/templates/tpl-1'],
            atRoot: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        await pathIs('/templates');
        expect(inspectable.snapshot()).toEqual({ path: '/templates', stack: ['/templates'], atRoot: true });
    });

    it('replaces the start route so Back returns to the chooser', async () => {
        const { inspectable } = renderApp('/workouts');

        fireEvent.click(screen.getByRole('button', { name: 'Start template' }));
        await pathIs('/sessions/start/tpl-1');
        expect(inspectable.snapshot()).toEqual({
            path: '/sessions/start/tpl-1',
            stack: ['/workouts', '/sessions/start/tpl-1'],
            atRoot: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Begin session' }));
        await pathIs('/sessions/sess-1');
        expect(inspectable.snapshot()).toEqual({
            path: '/sessions/sess-1',
            stack: ['/workouts', '/sessions/sess-1'],
            atRoot: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        await pathIs('/workouts');
        expect(inspectable.snapshot().atRoot).toBe(true);
    });

    it('replaces the history list so it does not stack under a session', async () => {
        const { inspectable } = renderApp('/sessions');

        fireEvent.click(screen.getByRole('button', { name: 'History list' }));
        await pathIs('/sessions');
        expect(inspectable.snapshot()).toEqual({ path: '/sessions', stack: ['/sessions'], atRoot: true });
    });
});
