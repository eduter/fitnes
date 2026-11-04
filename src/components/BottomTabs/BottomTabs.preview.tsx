import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import gymUrl from '../../../art/home/gym.png?url';
import type { TabId } from './BottomTabs.tsx';
import { BottomTabs, tabItems } from './BottomTabs.tsx';

const parameters = new URLSearchParams(location.search);
const proof = parameters.has('proof');

function Preview() {
    const initial = tabItems.find(({ id }) => id === parameters.get('active'))?.id ?? 'home';
    const [active, setActive] = createSignal<TabId>(initial);

    return (
        <main classList={{ 'tab-preview': !proof }}>
            <Show when={!proof}>
                <h1>Selected tab icons</h1>
                <p>Tap a tab to check its selection marker.</p>
            </Show>
            <div class="tab-preview__viewport">
                <div class="tab-preview__screen">
                    <img class="tab-preview__gym" src={gymUrl} width="256" height="184" alt="Gym artwork" />
                    <BottomTabs active={active()} onSelect={setActive} />
                </div>
            </div>
            <Show when={!proof}>
                <p>The 240-pixel proof crops 16 floor rows. The original gym artwork is unchanged.</p>
            </Show>
        </main>
    );
}

const target = document.getElementById('tab-preview');
if (!target) {
    throw new Error('Missing tab preview root');
}
render(() => <Preview />, target);
