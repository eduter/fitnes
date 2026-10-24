import { A } from '@solidjs/router';
import { For, type JSX, Show } from 'solid-js';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { icons } from './app/icons.ts';
import { primaryNavItems, secondaryNavItems } from './app/navigation.ts';
import { PixelIcon } from './components/PixelIcon.tsx';
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
                <div class="app-tabs-slot">
                    <nav class="app-tabs" aria-label="Main">
                        <For each={primaryNavItems}>
                            {(item) => (
                                <A href={item.href} end={item.href === '/'} aria-label={item.label}>
                                    <Show when={item.icon}>{(name) => <PixelIcon rows={icons[name()].large} />}</Show>
                                </A>
                            )}
                        </For>
                    </nav>
                </div>
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
