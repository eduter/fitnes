import { For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { SteelPanel } from './SteelPanel.tsx';

const proof = new URLSearchParams(location.search).has('proof');
const cases = [
    { name: 'Full width · 256×48', width: 256, height: 48 },
    { name: 'Narrow · 127×53', width: 127, height: 53 },
    { name: 'Tall · 201×121', width: 201, height: 121 },
    { name: 'Minimum · 20×20', width: 20, height: 20 },
];

function Preview() {
    return (
        <main class="steel-panel-preview">
            <Show when={!proof}>
                <h1>SteelPanel</h1>
                <p>
                    One reusable CSS border. No tabs or icons. Width and height belong to the caller; the last example
                    grows with its child.
                </p>
            </Show>
            <For each={cases}>
                {({ name, width, height }, i) => (
                    <section>
                        <Show when={!proof}>
                            <p>{name}</p>
                        </Show>
                        <SteelPanel
                            data-case={i()}
                            aria-label={name}
                            style={{ width: `${width}px`, height: `${height}px` }}
                        />
                    </section>
                )}
            </For>
            <section>
                <Show when={!proof}>
                    <p>Content-sized · 67 px child → 87 px panel</p>
                </Show>
                <SteelPanel data-case="content" aria-label="Content-sized example">
                    <div style={{ height: '67px' }} />
                </SteelPanel>
            </section>
        </main>
    );
}

const target = document.getElementById('panel-preview');
if (!target) {
    throw new Error('Missing SteelPanel preview root');
}
render(() => <Preview />, target);
