/* @refresh reload */
import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element #root not found');
}

render(
    () => (
        <Router root={App}>
            <Route path="/" component={Home} />
        </Router>
    ),
    root
);

registerSW({ immediate: true });

function Home() {
    return (
        <div class="placeholder">
            <h1>FitNES</h1>
            <p class="placeholder-text">Scaffolding is in place. Time to build the workout tracker.</p>
        </div>
    );
}
