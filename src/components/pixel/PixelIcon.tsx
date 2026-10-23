import type { JSX } from 'solid-js';

/** Icons extracted from the reference artwork. */
type PixelIconName =
    | 'calendar'
    | 'chart'
    | 'clipboard'
    | 'diamond'
    | 'dumbbell'
    | 'fire'
    | 'gear'
    | 'heart'
    | 'home'
    | 'progress'
    | 'target'
    | 'trend'
    | 'trophy';

interface PixelIconProps {
    name: PixelIconName;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
}

/** Pixel-art icon that is decorative by default and can optionally carry an accessible label. */
function PixelIcon(props: PixelIconProps): JSX.Element {
    const size = () => props.size ?? 'md';

    return (
        <img
            class={`pixel-icon pixel-icon--${size()} ${props.class ?? ''}`}
            src={`/pixel-icons/${props.name}.png`}
            alt={props.label ?? ''}
            aria-hidden={props.label === undefined ? 'true' : undefined}
            draggable={false}
        />
    );
}

export { PixelIcon };
export type { PixelIconName, PixelIconProps };
