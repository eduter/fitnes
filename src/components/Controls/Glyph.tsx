import type { JSX } from 'solid-js';

/** A filled pixel triangle for spinner steps and page navigation. */
function Triangle(props: { direction: 'up' | 'down' | 'left' | 'right' }): JSX.Element {
    if (props.direction === 'left' || props.direction === 'right') {
        return (
            <svg width="4" height="7" viewBox="0 0 4 7" aria-hidden="true" shape-rendering="crispEdges">
                <path
                    fill="currentColor"
                    transform={props.direction === 'right' ? 'translate(4 0) scale(-1 1)' : undefined}
                    d="M3 0h1v7H3zM2 1h1v5H2zM1 2h1v3H1zM0 3h1v1H0z"
                />
            </svg>
        );
    }
    return (
        <svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true" shape-rendering="crispEdges">
            <path
                fill="currentColor"
                transform={props.direction === 'down' ? 'rotate(180 3.5 2)' : undefined}
                d="M3 0h1v1H3zM2 1h3v1H2zM1 2h5v1H1zM0 3h7v1H0z"
            />
        </svg>
    );
}

export { Triangle };
