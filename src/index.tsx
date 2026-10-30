/* @refresh reload */
import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import { applyNesScale, syncNesHeight } from './app/nesScale.ts';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { WorkoutPickerPage } from './pages/WorkoutPickerPage.tsx';
import { BodyweightPage } from './pages/BodyweightPage.tsx';
import { DataPage } from './pages/DataPage.tsx';
import { ExerciseEditPage } from './pages/ExerciseEditPage.tsx';
import { ExerciseListPage } from './pages/ExerciseListPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SessionListPage } from './pages/SessionListPage.tsx';
import { SessionPage } from './pages/SessionPage.tsx';
import { StartSessionPage } from './pages/StartSessionPage.tsx';
import { TemplateEditPage } from './pages/TemplateEditPage.tsx';
import { TemplateListPage } from './pages/TemplateListPage.tsx';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element #root not found');
}

applyNesScale();
window.addEventListener('resize', applyNesScale);
new ResizeObserver(syncNesHeight).observe(root);

render(
    () => (
        <Router root={App}>
            <Route path="/" component={HomePage} />
            <Route path="/exercises" component={ExerciseListPage} />
            <Route path="/exercises/new" component={ExerciseEditPage} />
            <Route path="/exercises/:id" component={ExerciseEditPage} />
            <Route path="/templates" component={TemplateListPage} />
            <Route path="/templates/new" component={TemplateEditPage} />
            <Route path="/templates/:id" component={TemplateEditPage} />
            <Route path="/sessions" component={SessionListPage} />
            <Route path="/sessions/start/:templateId" component={StartSessionPage} />
            <Route path="/sessions/:id" component={SessionPage} />
            <Route path="/bodyweight" component={BodyweightPage} />
            <Route path="/data" component={DataPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/workouts/start" component={WorkoutPickerPage} />
        </Router>
    ),
    root
);

registerSW({ immediate: true });
