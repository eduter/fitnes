import { type JSX, onCleanup, onMount, Show } from 'solid-js';
import logoUrl from '../art/logo/logo.png?url';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { BottomTabs } from './components/BottomTabs/BottomTabs.tsx';
import { SteelPanel } from './components/SteelPanel/SteelPanel.tsx';
import { dbError, dbStatus } from './db/dbLifecycle.ts';
import { useActiveTab, useAppNavigate, useIsHome } from './routing/navigation.ts';
import './App.css';

/** The shared 256-pixel game screen, with persistent six-tab navigation. */
function App(props: AppProps): JSX.Element {
    const home = useIsHome();
    const activeTab = useActiveTab();
    const nav = useAppNavigate();

    onMount(() => {
        scaleScreen();
        window.addEventListener('resize', scaleScreen);
    });
    onCleanup(() => window.removeEventListener('resize', scaleScreen));

    return (
        <AppDataProvider>
            <div class="app" classList={{ 'app--home': home() }}>
                <Show when={home()}>
                    <header class="app-header">
                        <div class="app-title">
                            <img src={logoUrl} class="fitnes-logo" alt="FitNES" width="256" height="120" />
                        </div>
                    </header>
                </Show>
                <StatusBanner />
                <main class="app-main">
                    <Show when={home()} fallback={<SteelPanel class="page-panel">{props.children}</SteelPanel>}>
                        {props.children}
                    </Show>
                </main>
                <div class="app-tabs">
                    <BottomTabs
                        active={activeTab()}
                        onSelect={(tab) => {
                            nav.toTab(tab);
                            window.scrollTo(0, 0);
                        }}
                    />
                </div>
            </div>
        </AppDataProvider>
    );
}

interface AppProps {
    children?: JSX.Element;
}

function StatusBanner(): JSX.Element {
    const app = useAppData();
    return (
        <>
            <Show when={dbStatus() !== 'ready'}>
                <p class="banner" role="status">
                    {dbError() ?? 'Opening local database…'}
                </p>
            </Show>
            <Show when={app.loadState() === 'loading' && dbStatus() === 'ready'}>
                <p class="banner" role="status">
                    Loading local workouts…
                </p>
            </Show>
            <Show when={app.loadError()}>
                {(message) => (
                    <p class="banner" role="alert">
                        {message()}
                    </p>
                )}
            </Show>
        </>
    );
}

/** Align logical artwork pixels to whole device pixels, including on Android displays. */
function scaleScreen(): void {
    const ratio = window.devicePixelRatio || 1;
    const scale = Math.max(1, Math.min(2, Math.floor((window.innerWidth * ratio) / 256) / ratio));
    document.documentElement.style.setProperty('--screen-scale', String(scale));
}

export { App };
