import { A } from '@solidjs/router';
import { Show, type JSX } from 'solid-js';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { dbError, dbStatus } from './db/dbLifecycle.ts';
import './App.css';

interface AppProps {
    children?: JSX.Element;
}

function App(props: AppProps): JSX.Element {
    return (
        <AppDataProvider>
            <div class="app">
                <header class="app-header">
                    <A href="/" class="app-title" end>
                        FitNES
                    </A>
                    <nav class="app-nav">
                        <A href="/" end>
                            Home
                        </A>
                        <A href="/templates">Templates</A>
                        <A href="/exercises">Exercises</A>
                        <A href="/bodyweight">Weight</A>
                        <A href="/sessions">History</A>
                    </nav>
                </header>
                <StatusBanner />
                <main class="app-main">{props.children}</main>
            </div>
        </AppDataProvider>
    );
}

function StatusBanner(): JSX.Element {
    const app = useAppData();

    return (
        <>
            <Show when={dbStatus() !== 'ready'}>
                <p class="banner">{dbError() ?? 'Opening local database…'}</p>
            </Show>
            <Show when={app.loadError()}>{(message) => <p class="banner">{message()}</p>}</Show>
        </>
    );
}

export { App };
