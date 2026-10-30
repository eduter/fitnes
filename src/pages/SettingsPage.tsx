import { A } from '@solidjs/router';
import type { JSX } from 'solid-js';
import { PageHeader } from '../components/PageHeader.tsx';

/** Occasional maintenance, kept away from the everyday workout actions. */
function SettingsPage(): JSX.Element {
    return (
        <section class="page">
            <PageHeader title="Settings" />
            <A class="card-link" href="/data">
                <strong>Import / export</strong>
                <span class="muted">Back up your data or move it to another device.</span>
            </A>
            <p class="muted">
                FitNES stores your workouts on this device. Export a backup before clearing browser storage.
            </p>
        </section>
    );
}

export { SettingsPage };
