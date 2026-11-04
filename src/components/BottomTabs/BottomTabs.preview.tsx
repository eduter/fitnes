import { createEffect, createSignal, For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import type { IconChoices, IconVariant, TabId } from './BottomTabs.tsx';
import { BottomTabs, iconVariants, tabIconUrl, tabItems } from './BottomTabs.tsx';
import './preview.css';

const parameters = new URLSearchParams(location.search);
const proof = parameters.has('proof');
const initialVariant = parameters.get('variant');
const variant: IconVariant = initialVariant === 'b' || initialVariant === 'c' ? initialVariant : 'a';
const encodedChoices = parameters.get('choices') ?? '';
const initialChoices = Object.fromEntries(
    tabItems.map(({ id }, index) => [id, /^[abc]{6}$/.test(encodedChoices) ? encodedChoices[index] : variant])
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
                    <p class="eyebrow">FitNES / ARTWORK STUDY 01</p>
                    <h1>
                        Small icons.
                        <br />
                        Plenty of character.
                    </h1>
                    <p class="intro">
                        Three alternatives for each tab. Pick any combination and see it in the steel bar below.
                    </p>
                    <div class="gallery-facts">
                        <span>24 × 24 pixels</span>
                        <span>6 tabs</span>
                        <span>18 alternatives</span>
                    </div>
                </header>
                <div class="gallery-presets">
                    <span>Try a set</span>
                    <For each={iconVariants}>
                        {(option) => (
                            <button
                                type="button"
                                onClick={() =>
                                    setChoices(
                                        Object.fromEntries(tabItems.map(({ id }) => [id, option])) as IconChoices
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
                                <Show when={item.id === 'settings'}>
                                    <p class="family-note">Data lives here, with room for future settings.</p>
                                </Show>
                                <div class="icon-options">
                                    <For each={iconVariants}>
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
                                                    <span>{option.toUpperCase()}</span>
                                                </button>
                                                <a
                                                    href={tabIconUrl(item.id, option)}
                                                    download={`${item.id}-${option}.svg`}
                                                    aria-label={`Download ${item.label} option ${option.toUpperCase()}`}
                                                >
                                                    SVG ↓
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
                    Use the scale controls to compare.
                </p>
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
