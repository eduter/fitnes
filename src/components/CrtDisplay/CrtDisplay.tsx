import { type JSX, Show } from 'solid-js';
import { useAppData } from '../../app/AppData.tsx';
import './CrtDisplay.css';

/** Paint the adopted CRT treatment above the full app, including root-mounted dialogs. */
function CrtDisplay(): JSX.Element {
    const app = useAppData();
    const strength = () => app.crtIntensity() / 100;

    return (
        <Show when={app.crtIntensity() > 0}>
            <div
                class="crt-display"
                aria-hidden="true"
                style={{
                    '--crt-strength': strength(),
                    '--crt-mask': Math.sqrt(strength()) * 0.9,
                }}
            />
        </Show>
    );
}

export { CrtDisplay };
