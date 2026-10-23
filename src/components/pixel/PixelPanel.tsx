import { Show, type JSX } from 'solid-js';

/** Visual treatments available for a bordered pixel panel. */
type PixelPanelVariant = 'default' | 'inset' | 'highlight';

interface PixelPanelProps {
    children: JSX.Element;
    title?: string;
    actions?: JSX.Element;
    variant?: PixelPanelVariant;
    class?: string;
}

/** Reusable NES-style surface with the reference border, corner bolts, and an optional heading. */
function PixelPanel(props: PixelPanelProps): JSX.Element {
    const variant = () => props.variant ?? 'default';

    return (
        <section class={`pixel-panel pixel-panel--${variant()} ${props.class ?? ''}`}>
            <Show when={props.title}>
                {(title) => (
                    <header class="pixel-panel__header">
                        <h2 class="pixel-panel__title">{title()}</h2>
                        {props.actions}
                    </header>
                )}
            </Show>
            {props.children}
        </section>
    );
}

export { PixelPanel };
export type { PixelPanelProps, PixelPanelVariant };
