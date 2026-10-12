import { onMount, type JSX } from 'solid-js';
import { waitForDb } from './db/dbLifecycle.ts';
import './App.css';

interface AppProps {
    children?: JSX.Element;
}

function App(props: AppProps) {
    onMount(() => {
        void waitForDb();
    });

    return (
        <div class="app">
            <header class="app-header">
                <h1 class="app-title">FitNES</h1>
            </header>
            <main class="app-main">{props.children}</main>
        </div>
    );
}

export { App };
