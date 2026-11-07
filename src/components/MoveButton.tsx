import type { JSX } from 'solid-js';
import { Button, type ButtonProps } from './Button/Button.tsx';

/** Move an ordered item toward the destination bar; never use this glyph for quantity changes. */
function MoveButton(props: MoveButtonProps): JSX.Element {
    return (
        <Button aria-label={props.label} disabled={props.disabled} onPress={props.onPress}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
                <path
                    fill="currentColor"
                    transform={props.direction === 'down' ? 'rotate(180 8 8)' : undefined}
                    d="M2 1h12v2H2zM7 5h2v10H7zM6 6h1v3H6zM5 7h1v3H5zM4 8h1v3H4zM9 6h1v3H9zM10 7h1v3h-1zM11 8h1v3h-1z"
                />
            </svg>
        </Button>
    );
}

/** A text-equivalent accessible verb plus the direction and ordinary button behavior. */
interface MoveButtonProps extends Pick<ButtonProps, 'disabled' | 'onPress'> {
    label: string;
    direction: 'up' | 'down';
}

export type { MoveButtonProps };
export { MoveButton };
