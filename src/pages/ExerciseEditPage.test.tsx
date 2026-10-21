/** @vitest-environment jsdom */

import { MemoryRouter, Route, createMemoryHistory } from '@solidjs/router';
import { render, waitFor } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { AppDataProvider } from '../app/AppData.tsx';
import { ExerciseEditPage } from './ExerciseEditPage.tsx';

/**
 * Render the exercise editor under a real router, so navigating from one
 * exercise to another takes the same route-matching path the app uses.
 */
function renderEditor(initialUrl: string) {
    const history = createMemoryHistory();
    history.set({ value: initialUrl, replace: true });

    const result = render(() => (
        <MemoryRouter history={history} root={(props) => <AppDataProvider>{props.children}</AppDataProvider>}>
            <Route path="/exercises/:id" component={ExerciseEditPage} />
        </MemoryRouter>
    ));

    return { ...result, history };
}

describe('ExerciseEditPage', () => {
    it('shows the exercise named by the current route after navigating to another exercise', async () => {
        const { getByLabelText, history } = renderEditor('/exercises/ex-pull-up');

        const name = getByLabelText('Name') as HTMLInputElement;
        await waitFor(() => expect(name.value).toBe('Pull-up'));

        history.set({ value: '/exercises/ex-plank', replace: false });

        await waitFor(() => expect(name.value).toBe('Plank'));
    });
});
