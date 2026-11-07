/** @vitest-environment jsdom */
import { createMemoryHistory, MemoryRouter, Route, useNavigate } from '@solidjs/router';
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, expect, it } from 'vitest';
import { Button } from '../components/Controls/index.ts';
import { DraftGuard } from './DraftGuard.tsx';

afterEach(cleanup);

it('keeps a draft on No and navigates only after explicit discard', async () => {
    const history = createMemoryHistory();
    render(() => (
        <MemoryRouter history={history}>
            <Route
                path="/"
                component={() => {
                    const navigate = useNavigate();
                    return (
                        <>
                            <DraftGuard dirty />
                            <h1>Draft</h1>
                            <Button onPress={() => navigate('/other')}>Go</Button>
                        </>
                    );
                }}
            />
            <Route path="/other" component={() => <h1>Other</h1>} />
        </MemoryRouter>
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Go', exact: true }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.animationEnd(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'No', exact: true }));
    fireEvent.animationEnd(dialog);
    expect(screen.getByRole('heading', { name: 'Draft' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go', exact: true }));
    const next = await screen.findByRole('dialog');
    fireEvent.animationEnd(next);
    fireEvent.click(screen.getByRole('button', { name: 'Yes', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Other' })).toBeTruthy();
});
