import { useLocation, useNavigate } from '@solidjs/router';
import { type Accessor, createMemo } from 'solid-js';
import { basePath, pathWithinBase } from '../app/basePath.ts';
import type { TabId } from '../components/BottomTabs/BottomTabs.tsx';

// Keyed by the tab bar's own ids, so adding a destination there fails this
// mapping's exhaustiveness check until its route is supplied.
const TAB_ROUTES: Record<TabId, string> = {
    home: '/',
    exercises: '/exercises',
    templates: '/templates',
    weight: '/bodyweight',
    history: '/sessions',
    settings: '/data',
};

const WORKOUT_PICKER_ROUTE = '/workouts';

function workoutPath(id: string): string {
    return `/templates/${id}`;
}

function sessionPath(id: string): string {
    return `/sessions/${id}`;
}

/** Whether a base-relative path is the route itself or a path nested under it. */
function pathIsUnder(path: string, route: string): boolean {
    return path === route || path.startsWith(`${route}/`);
}

/** Route-aware navigation helpers that keep the app's history rules in one place. */
function useAppNavigate() {
    const navigate = useNavigate();

    return {
        toTab(tab: TabId): void {
            // Tabs are peers, not a stack: replace so Back never walks through them.
            navigate(TAB_ROUTES[tab], { replace: true });
        },
        toWorkoutPicker(): void {
            navigate(WORKOUT_PICKER_ROUTE);
        },
        toWorkoutsList(): void {
            navigate(TAB_ROUTES.templates, { replace: true });
        },
        toWorkout(id: string): void {
            navigate(workoutPath(id));
        },
        toNewWorkout(): void {
            navigate('/templates/new');
        },
        replaceWorkout(id: string): void {
            // The create route must not stay under the saved workout, or Back reopens it.
            navigate(workoutPath(id), { replace: true });
        },
        toStartSession(templateId: string): void {
            navigate(`/sessions/start/${templateId}`);
        },
        toSession(id: string): void {
            navigate(sessionPath(id));
        },
        replaceSession(id: string): void {
            // Starting replaces the start route, so Back returns to the chooser.
            navigate(sessionPath(id), { replace: true });
        },
        toHistoryList(): void {
            navigate(TAB_ROUTES.history, { replace: true });
        },
        goBack(): void {
            navigate(-1);
        },
    };
}

/** Derive the active bottom-bar destination from the current pathname. */
function useActiveTab(): Accessor<TabId> {
    const location = useLocation();

    return createMemo(() => {
        const path = pathWithinBase(location.pathname, basePath);
        if (pathIsUnder(path, TAB_ROUTES.exercises)) {
            return 'exercises';
        }
        if (pathIsUnder(path, TAB_ROUTES.templates)) {
            return 'templates';
        }
        if (pathIsUnder(path, TAB_ROUTES.weight)) {
            return 'weight';
        }
        if (pathIsUnder(path, TAB_ROUTES.history)) {
            return 'history';
        }
        if (pathIsUnder(path, TAB_ROUTES.settings)) {
            return 'settings';
        }
        return 'home';
    });
}

/** Whether the current pathname is the Home destination, which owns the artwork and logo. */
function useIsHome(): Accessor<boolean> {
    const location = useLocation();

    return createMemo(() => pathWithinBase(location.pathname, basePath) === '/');
}

export { useActiveTab, useAppNavigate, useIsHome };
