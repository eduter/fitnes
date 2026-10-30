/** @vitest-environment jsdom */

import { createMemoryHistory, MemoryRouter, Route, Router } from '@solidjs/router';
import { cleanup, fireEvent, render, waitFor, within } from '@solidjs/testing-library';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App.tsx';
import { AppDataProvider } from '../app/AppData.tsx';
import { db } from '../db/database.ts';
import { listExercises, listTemplates, putTemplate } from '../db/repository.ts';
import { createWorkoutTemplate } from '../domain/createWorkoutTemplate.ts';
import { defaultPrescription } from '../domain/defaultPrescription.ts';
import { exampleExercises, pullUp } from '../domain/examples.ts';
import { generatePlannedSetId, generateSequenceEntryId } from '../domain/generateIds.ts';
import { ExerciseEditPage } from './ExerciseEditPage.tsx';
import { ExerciseListPage } from './ExerciseListPage.tsx';
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

describe('ExerciseEditPage', () => {
    it('re-hydrates the draft when the route points at another exercise', async () => {
        const { getByLabelText, history } = renderEditor('/exercises/ex-pull-up', '/exercises/:id', ExerciseEditPage);

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Pull-up'));

        history.set({ value: '/exercises/ex-plank', replace: false });

        await waitFor(() => expect(name.value).toBe('Plank'));
    });

    it('shows the copy after Duplicate instead of the source document', async () => {
        const { getByLabelText, getByRole } = renderAppAt('/exercises/ex-wrist-curl', () => (
            <>
                <Route path="/exercises" component={ExerciseListPage} />
                <Route path="/exercises/:id" component={ExerciseEditPage} />
            </>
        ));

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Wrist curl'));

        fireEvent.click(getByRole('button', { name: 'Duplicate' }));

        await waitFor(() => expect(name.value).toBe('Wrist curl (copy)'));
    });

    it('applies an edit made immediately after Duplicate to the copy, not the source', async () => {
        const { getByLabelText, getByRole } = renderAppAt('/exercises/ex-wrist-curl', () => (
            <>
                <Route path="/exercises" component={ExerciseListPage} />
                <Route path="/exercises/:id" component={ExerciseEditPage} />
            </>
        ));

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Wrist curl'));

        fireEvent.click(getByRole('button', { name: 'Duplicate' }));
        fireEvent.input(name, { target: { value: 'Raced edit' } });

        await waitFor(async () => {
            const exercises = await listExercises(db);
            expect(exercises.find((exercise) => exercise.id === 'ex-wrist-curl')?.name).toBe('Wrist curl');
            expect(exercises.some((exercise) => exercise.name === 'Raced edit')).toBe(true);
        });
    });
});

describe('TemplateEditPage', () => {
    it('re-hydrates the draft when the route points at another template', async () => {
        const { getByLabelText, history } = renderEditor(
            `/templates/${TEMPLATE_ID}`,
            '/templates/:id',
            TemplateEditPage
        );

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Test day'));

        history.set({ value: `/templates/${OTHER_TEMPLATE_ID}`, replace: false });

        await waitFor(() => expect(name.value).toBe('Other day'));
    });

    it('shows the copy after Duplicate instead of the source template', async () => {
        const { getByLabelText } = renderAppAt(`/templates/${TEMPLATE_ID}`, () => (
            <>
                <Route path="/templates" component={TemplateListPage} />
                <Route path="/templates/:id" component={TemplateEditPage} />
            </>
        ));

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Test day'));

        const actions = document.querySelector('.page-actions');
        if (!actions) {
            throw new Error('page actions missing');
        }
        fireEvent.click(within(actions as HTMLElement).getByRole('button', { name: 'Duplicate' }));

        await waitFor(() => expect(name.value).toBe('Test day (copy)'));
    });

    it('applies an edit made immediately after Duplicate to the copy, not the source', async () => {
        const { getByLabelText } = renderAppAt(`/templates/${TEMPLATE_ID}`, () => (
            <>
                <Route path="/templates" component={TemplateListPage} />
                <Route path="/templates/:id" component={TemplateEditPage} />
            </>
        ));

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Test day'));

        const actions = document.querySelector('.page-actions');
        if (!actions) {
            throw new Error('page actions missing');
        }
        fireEvent.click(within(actions as HTMLElement).getByRole('button', { name: 'Duplicate' }));
        fireEvent.input(name, { target: { value: 'Raced template' } });

        await waitFor(async () => {
            const templates = await listTemplates(db);
            expect(templates.find((template) => template.id === TEMPLATE_ID)?.name).toBe('Test day');
            expect(templates.some((template) => template.name === 'Raced template')).toBe(true);
        });
    });
});
