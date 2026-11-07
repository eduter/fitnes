import { useLocation, useNavigate } from '@solidjs/router';
import { onCleanup, onMount, Show, type JSX } from 'solid-js';
import logoUrl from '../docs/fitnes-logo.png?url';
import { AppDataProvider, useAppData } from './app/AppData.tsx';
import { BottomTabs, type TabId } from './components/BottomTabs/BottomTabs.tsx';
import { SteelPanel } from './components/SteelPanel/SteelPanel.tsx';
import { dbError, dbStatus } from './db/dbLifecycle.ts';
import './App.css';

/** The shared 256-pixel game screen, with persistent six-tab navigation. */
function App(props: AppProps): JSX.Element {
    const location = useLocation();
    const navigate = useNavigate();
    const home = () => location.pathname === '/';
    const active = (): TabId => {
        const path = location.pathname;
        if (path.startsWith('/templates')) {
            return 'templates';
        }
        if (path.startsWith('/exercises')) {
            return 'exercises';
        }
        if (path.startsWith('/bodyweight')) {
            return 'weight';
        }
        if (path.startsWith('/sessions')) {
            return 'history';
        }
        if (path.startsWith('/data')) {
            return 'settings';
        }
        return 'home';
    };
    const destinations: Record<TabId, string> = {
        home: '/',
        templates: '/templates',
        exercises: '/exercises',
        weight: '/bodyweight',
        history: '/sessions',
        settings: '/data',
    };

    onMount(() => {
        scaleScreen();
        window.addEventListener('resize', scaleScreen);
    });
    onCleanup(() => window.removeEventListener('resize', scaleScreen));

    return (
        <AppDataProvider>
            <svg class="palette-definitions" width="0" height="0" aria-hidden="true">
                <defs>
                    <filter id="logo-palette" color-interpolation-filters="sRGB">
                        <feColorMatrix
                            type="matrix"
                            values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"
                        />
                        <feComponentTransfer>
                            <feFuncR type="discrete" tableValues="0 1 1 1" />
                            <feFuncG type="discrete" tableValues="0 0.460784 0.547059 0.801961" />
                            <feFuncB type="discrete" tableValues="0 0.307843 0.127451 0.515686" />
                        </feComponentTransfer>
                    </filter>
                </defs>
            </svg>
            <div class="app" classList={{ 'app--home': home() }}>
                <Show when={home()}>
                    <header class="app-header">
                        <div class="app-title">
                            <img src={logoUrl} class="fitnes-logo" alt="FitNES" width="244" height="114" />
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
                        active={active()}
                        onSelect={(tab) => {
                            navigate(destinations[tab]);
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
