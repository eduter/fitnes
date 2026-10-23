import type { JSX } from 'solid-js';

interface PixelHeroProps {
    children?: JSX.Element;
    class?: string;
}

/** Gym artwork surface for dashboard headlines or calls to action. */
function PixelHero(props: PixelHeroProps): JSX.Element {
    return (
        <section class={`pixel-hero ${props.class ?? ''}`}>
            <div class="pixel-hero__content">{props.children}</div>
        </section>
    );
}

export { PixelHero };
export type { PixelHeroProps };
