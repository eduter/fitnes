import { A } from '@solidjs/router';
import { For, Show, type JSX } from 'solid-js';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { primaryNavItems, secondaryNavItems } from './app/navigation.ts';
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
                    <nav class="app-header__links">
                        <For each={secondaryNavItems}>{(item) => <A href={item.href}>{item.label}</A>}</For>
                    </nav>
                </header>
                <StatusBanner />
                <main class="app-main">{props.children}</main>
                <nav class="app-tabs" aria-label="Main">
                    <For each={primaryNavItems}>
                        {(item) => (
                            <A href={item.href} end={item.href === '/'}>
                                <span class="app-tabs__icon" aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span class="app-tabs__label">{item.label}</span>
                            </A>
                        )}
                    </For>
                </nav>
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
