import { A } from '@solidjs/router';
import { Portal } from 'solid-js/web';
import { For, Show, type JSX } from 'solid-js';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { primaryNavItems, secondaryNavItems } from './app/navigation.ts';
import { NavIcon } from './components/NavIcon.tsx';
import { dbError, dbStatus } from './db/dbLifecycle.ts';
import './App.css';

interface AppProps {
    children?: JSX.Element;
}

/** Offline workout tracker with persistent navigation and local data. */
function App(props: AppProps): JSX.Element {
    return (
        <AppDataProvider>
            <AppShell>{props.children}</AppShell>
        </AppDataProvider>
    );
}

function AppShell(props: AppProps): JSX.Element {
    const app = useAppData();
    return (
        <>
            <div class="app">
                <header class="app-header">
                    <A href="/" class="app-title" end>
                        FitNES
                    </A>
                    <nav class="app-header__links">
                        <For each={secondaryNavItems}>{(item) => <A href={item.href}>{item.label}</A>}</For>
                    </nav>
                </header>
                <StatusBanner />
                <main class="app-main" aria-busy={app.loadState() === 'loading'}>
                    {props.children}
                </main>
            </div>
            <Portal>
                <div class="nav-host">
                    <nav class="app-tabs" aria-label="Main">
                        <For each={primaryNavItems}>
                            {(item) => (
                                <A href={item.href} end={item.href === '/'}>
                                    <NavIcon name={item.icon} />
                                    <span class="app-tabs__label">{item.label}</span>
                                </A>
                            )}
                        </For>
                    </nav>
                </div>
            </Portal>
        </>
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
