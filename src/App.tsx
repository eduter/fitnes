import { A, useLocation } from '@solidjs/router';
import { For, type JSX, Show } from 'solid-js';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { icons } from './app/icons.ts';
import { primaryNavItems, secondaryNavItems } from './app/navigation.ts';
import { dbError, dbStatus } from './db/dbLifecycle.ts';
import './App.css';

interface AppProps {
    children?: JSX.Element;
}

/** Columns of the 16-pixel grid the five symbols occupy. Two columns is one 32-pixel picture. */
const tabColumns = ['2 / span 2', '5 / span 2', '8 / span 2', '11 / span 2', '14 / span 2'];

function App(props: AppProps): JSX.Element {
    const location = useLocation();

    return (
        <AppDataProvider>
            <div class="app">
                <header class="app-header">
                    <Show when={location.pathname !== '/'}>
                        <A href="/" class="app-title" end>
                            FitNES
                        </A>
                    </Show>
                    <nav class="app-header__links">
                        <For each={secondaryNavItems}>{(item) => <A href={item.href}>{item.label}</A>}</For>
                    </nav>
                </header>
                <StatusBanner />
                <main class="app-main">{props.children}</main>
                <div class="app-tabs-slot">
                    <nav class="app-tabs" aria-label="Main">
                        <For each={primaryNavItems}>
                            {(item, index) => (
                                <A
                                    href={item.href}
                                    end={item.href === '/'}
                                    aria-label={item.label}
                                    style={{ 'grid-column': tabColumns[index()] }}
                                >
                                    <span class="tab-mark">
                                        <span class="tab-mark__bar" />
                                    </span>
                                    <Show when={item.icon}>
                                        {(name) => (
                                            <img class="pixel-art" src={icons[name()]} width={32} height={32} alt="" />
                                        )}
                                    </Show>
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
