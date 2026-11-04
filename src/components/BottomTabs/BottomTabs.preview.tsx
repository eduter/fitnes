import { createEffect, createSignal, For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import gymUrl from '../../../art/home/gym.png?url';
import type { IconChoices, IconVariant, TabId } from './BottomTabs.tsx';
import { acceptedTabs, BottomTabs, iconVariants, tabIconUrl, tabItems } from './BottomTabs.tsx';
import './preview.css';

const descriptions: Record<string, string[]> = {
    weight: ['Analog bathroom scale', 'Digital glass platform', 'Medical balance scale'],
    history: ['Back arrow and clock', 'Return arrow and clock', 'Previous workout log'],
    settings: ['Eight-tooth gear', 'Six-tooth gear', 'Riveted eight-tooth gear'],
};

const parameters = new URLSearchParams(location.search);
const proof = parameters.has('proof');
const initialVariant = parameters.get('variant');
const variant: IconVariant = initialVariant === 'b' || initialVariant === 'c' ? initialVariant : 'a';
const encodedChoices = parameters.get('choices') ?? '';
const initialChoices = Object.fromEntries(
    tabItems.map(({ id }, index) => [
        id,
        acceptedTabs.has(id) ? 'a' : /^[abc]{6}$/.test(encodedChoices) ? encodedChoices[index] : variant,
    ])
) as IconChoices;
const initialActive = tabItems.find(({ id }) => id === parameters.get('active'))?.id ?? 'home';

function Preview() {
    const [choices, setChoices] = createSignal(initialChoices);
    const [active, setActive] = createSignal<TabId>(initialActive);
    const current = () => tabItems.find(({ id }) => id === active());

    createEffect(() => {
        if (proof) {
            return;
        }
        const url = new URL(location.href);
        url.searchParams.set('choices', tabItems.map(({ id }) => choices()[id]).join(''));
        url.searchParams.set('active', active());
        history.replaceState(null, '', url);
    });

    function choose(tab: TabId, option: IconVariant): void {
        setChoices((previous) => ({ ...previous, [tab]: option }));
    }

    return (
        <main classList={{ 'icon-gallery': !proof, 'icon-proof': proof }}>
            <Show when={!proof}>
                <header class="gallery-header">
                    <p class="eyebrow">FitNES / TAB ICONS · ROUND 2</p>
                    <h1>Choose the remaining icons.</h1>
                    <p class="intro">
                        Home A, Templates A, and Exercises A are selected. Compare the new History, Settings, and Weight
                        options in the home artwork’s warm palette.
                    </p>
                    <div class="gallery-facts">
                        <span>24 × 24 PNG</span>
                        <span>3 selected</span>
                        <span>9 new alternatives</span>
                    </div>
                </header>
                <details class="context-review" open>
                    <summary>See the icons with the home artwork</summary>
                    <div class="context-screen">
                        <img
                            class="gym-context"
                            src={gymUrl}
                            alt="Home gym artwork, cropped to leave room for the bottom bar"
                            width="256"
                            height="184"
                        />
                        <BottomTabs choices={choices()} active={active()} onSelect={setActive} />
                    </div>
                    <p>
                        One shared home palette and emphasis. This 240-pixel proof crops 16 floor rows; the original
                        artwork is unchanged.
                    </p>
                </details>
                <div class="gallery-presets">
                    <span>Try a set</span>
                    <For each={iconVariants}>
                        {(option) => (
                            <button
                                type="button"
                                onClick={() =>
                                    setChoices(
                                        Object.fromEntries(
                                            tabItems.map(({ id }) => [id, acceptedTabs.has(id) ? 'a' : option])
                                        ) as IconChoices
                                    )
                                }
                            >
                                Set {option.toUpperCase()}
                            </button>
                        )}
                    </For>
                </div>
                <div class="gallery-grid">
                    <For each={tabItems}>
                        {(item, index) => (
                            <section class="icon-family">
                                <div class="family-heading">
                                    <h2>{item.label}</h2>
                                    <span>0{index() + 1}</span>
                                </div>
                                <Show when={acceptedTabs.has(item.id)}>
                                    <p class="family-note">Selected · A silhouette retained</p>
                                </Show>
                                <Show when={item.id === 'settings'}>
                                    <p class="family-note">Data lives here, with room for future settings.</p>
                                </Show>
                                <div class="icon-options">
                                    <For each={acceptedTabs.has(item.id) ? (['a'] as const) : iconVariants}>
                                        {(option) => (
                                            <div class="icon-option">
                                                <button
                                                    type="button"
                                                    class="icon-choice"
                                                    aria-label={`${item.label} option ${option.toUpperCase()}`}
                                                    aria-pressed={choices()[item.id] === option}
                                                    onClick={() => choose(item.id, option)}
                                                >
                                                    <img
                                                        src={tabIconUrl(item.id, option)}
                                                        width="72"
                                                        height="72"
                                                        alt=""
                                                    />
                                                    <span>
                                                        {option.toUpperCase()}
                                                        <Show when={descriptions[item.id]}>
                                                            {' '}
                                                            · {descriptions[item.id]?.[iconVariants.indexOf(option)]}
                                                        </Show>
                                                    </span>
                                                </button>
                                                <a
                                                    href={tabIconUrl(item.id, option)}
                                                    download={`${item.id}-${option}.png`}
                                                    aria-label={`Download ${item.label} option ${option.toUpperCase()}`}
                                                >
                                                    PNG ↓
                                                </a>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </section>
                        )}
                    </For>
                </div>
                <p class="gallery-footnote">
                    Artwork is shown at 3× above. The bar uses the original 24-pixel assets in a 256 × 56 steel panel.
                    PNG pixels stay sharp at exact 1×, 2×, and 3× scales. Your picks stay in the page URL.
                </p>
            </Show>
            <Show when={proof}>
                <img class="gym-context" src={gymUrl} alt="" width="256" height="184" />
            </Show>
            <div class="bar-dock">
                <Show when={!proof}>
                    <div class="dock-heading">
                        <span>Your combination</span>
                        <output aria-live="polite">
                            {current()?.label}
                            <Show when={active() === 'settings'}> · Data & preferences</Show>
                        </output>
                    </div>
                    <div class="scale-options">
                        <For each={[1, 2, 3]}>
                            {(scale) => (
                                <button
                                    type="button"
                                    onClick={() =>
                                        document.documentElement.style.setProperty('--bar-scale', String(scale))
                                    }
                                >
                                    {scale}×
                                </button>
                            )}
                        </For>
                    </div>
                </Show>
                <div class="bar-viewport">
                    <div class="bar-scale">
                        <BottomTabs choices={choices()} active={active()} onSelect={setActive} />
                    </div>
                </div>
                <Show when={!proof}>
                    <p class="dock-caption">Home · Templates · Exercises · Weight · History · Settings</p>
                </Show>
            </div>
        </main>
    );
}

const target = document.getElementById('tab-preview');
if (!target) {
    throw new Error('Missing tab icon preview root');
}
render(() => <Preview />, target);
