/** @vitest-environment jsdom */

import { createMemoryHistory, MemoryRouter, Route, Router } from '@solidjs/router';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App.tsx';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { listTemplates, putTemplate } from '../db/repository.ts';
import { createWorkoutTemplate } from '../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../domain/defaultPrescription.ts';
import { exampleExercises, pullUp } from '../domain/examples.ts';
import { generatePlannedSetId, generateSequenceEntryId } from '../domain/generateIds.ts';
import { ExerciseEditPage } from './ExerciseEditPage.tsx';
import { TemplateEditPage } from './TemplateEditPage.tsx';
import { TemplateListPage } from './TemplateListPage.tsx';

const TEMPLATE_ID = 'tpl-test-a';
const OTHER_TEMPLATE_ID = 'tpl-test-b';

/** Seed the catalog and two templates into the database the app itself opens. */
async function seedDatabase(): Promise<void> {
    for (const [id, name] of [
        [TEMPLATE_ID, 'Test day'],
        [OTHER_TEMPLATE_ID, 'Other day'],
    ]) {
        const plannedSetId = generatePlannedSetId();
        const result = createWorkoutTemplate({
            id,
            name,
            catalog: exampleExercises,
            sets: [{ id: plannedSetId, exerciseId: pullUp.id, prescription: defaultPrescription(pullUp) }],
            sequence: [{ id: generateSequenceEntryId(), plannedSetId }],
        });

        if (!result.ok) {
            throw new Error(`test template '${id}' failed validation`);
        }

        const saved = await putTemplate(db, result.value);
        if (!saved.ok) {
            throw new Error(`test template '${id}' failed to save`);
        }
    }
}

/**
 * Render an edit page under a memory router, so navigating from one saved
 * document to another takes the same route-matching path the app uses.
 */
function renderEditor(initialUrl: string, routePath: string, page: () => unknown) {
    const history = createMemoryHistory();
    history.set({ value: initialUrl, replace: true });

    const result = render(() => (
        <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path={routePath} component={page} />
        </MemoryRouter>
    ));

    return { ...result, history };
}

/**
 * Render under the real `Router` and the real `App` root, which is how
 * `index.tsx` mounts the app. The browser reaches a route change through this
 * path, so it is the faithful setup for a navigation the user triggers.
 */
function renderAppAt(url: string, children: () => unknown) {
    window.history.replaceState({}, '', url);

    return render(() => <Router root={App}>{children()}</Router>);
}

beforeAll(async () => {
    await seedDatabase();
});

afterEach(() => {
    cleanup();
});

async function openEditor(view: ReturnType<typeof render>, label: string): Promise<HTMLInputElement> {
    const actions = view.container.querySelector('.template-form > .button-row');
    fireEvent.click(
        actions
            ? within(actions as HTMLElement).getByRole('button', { name: label, exact: true })
            : await view.findByRole('button', { name: label, exact: true })
    );
    const dialog = await within(document.body).findByRole('dialog');
    fireEvent.animationEnd(dialog, { animationName: 'nes-popover-reveal' });
    return within(document.body).getByLabelText('Name') as HTMLInputElement;
}

describe('editor route hydration', () => {
    it('re-hydrates an open exercise form when the route changes', async () => {
        const view = renderEditor('/exercises/ex-pull-up', '/exercises/:id', ExerciseEditPage);
        const editor = await within(document.body).findByRole('dialog', { name: 'Edit exercise' });
        fireEvent.animationEnd(editor);
        const name = within(editor).getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
        expect(name.value).toBe('Pull-up');
        view.history.set({ value: '/exercises/ex-plank', replace: false });
        await waitFor(() => expect(name.value).toBe('Plank'));
    });

    it('re-hydrates open template details when the route changes', async () => {
        const view = renderEditor(`/templates/${TEMPLATE_ID}`, '/templates/:id', TemplateEditPage);
        await view.findByRole('heading', { name: 'Test day' });
        const name = await openEditor(view, 'Details');
        expect(name.value).toBe('Test day');
        view.history.set({ value: `/templates/${OTHER_TEMPLATE_ID}`, replace: false });
        await waitFor(() => expect(name.value).toBe('Other day'));
    });

    it('edits a template copy without modifying its source', async () => {
        const view = renderAppAt(`/templates/${TEMPLATE_ID}`, () => (
            <>
                <Route path="/templates" component={TemplateListPage} />
                <Route path="/templates/:id" component={TemplateEditPage} />
            </>
        ));
        await view.findByRole('heading', { name: 'Test day' });
        fireEvent.click(
            within(view.container.querySelector('.template-form > .button-row') as HTMLElement).getByRole('button', {
                name: 'More',
                exact: true,
            })
        );
        const menu = await screen.findByRole('dialog', { name: 'Workout actions' });
        fireEvent.animationEnd(menu);
        fireEvent.click(within(menu).getByRole('button', { name: 'Duplicate', exact: true }));
        fireEvent.animationEnd(menu);
        await view.findByRole('heading', { name: 'Test day (copy)' });
        const name = await openEditor(view, 'Details');
        fireEvent.input(name, { target: { value: 'Copy template' } });
        await waitFor(async () => {
            const records = await listTemplates(db);
            expect(records.find((item) => item.id === TEMPLATE_ID)?.name).toBe('Test day');
            expect(records.some((item) => item.name === 'Copy template')).toBe(true);
        });
    });
});
