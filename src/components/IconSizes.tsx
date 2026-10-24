import { For, type JSX } from 'solid-js';
import { iconNames, icons } from '../app/icons.ts';
import { PixelIcon } from './PixelIcon.tsx';

/** Three drawings of the same five symbols, so the sizes can be compared. */
function IconSizes(): JSX.Element {
    return (
        <section class="card icon-sizes" aria-label="Icon sizes">
            <h2 class="section-title">Icon sizes</h2>
            <p class="muted">16 is the size in the bar.</p>
            <div class="icon-sizes__row">
                <span class="icon-sizes__label">8</span>
                <For each={iconNames}>{(name) => <PixelIcon rows={icons[name].small} />}</For>
            </div>
            <div class="icon-sizes__row">
                <span class="icon-sizes__label">16</span>
                <For each={iconNames}>{(name) => <PixelIcon rows={icons[name].large} />}</For>
            </div>
            <div class="icon-sizes__row">
                <span class="icon-sizes__label">24</span>
                <For each={iconNames}>{(name) => <PixelIcon rows={icons[name].small} pixel={3} />}</For>
            </div>
        </section>
    );
}

export { IconSizes };
