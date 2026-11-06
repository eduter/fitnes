import type { JSX } from 'solid-js';

/** The selected two-pixel-stroke leading action chevron. */
function Chevron(): JSX.Element {
    return (
        <svg width="6" height="9" viewBox="0 0 6 9" aria-hidden="true" shape-rendering="crispEdges">
            <path
                fill="currentColor"
                d="M0 0h2v1H0zM1 1h2v1H1zM2 2h2v1H2zM3 3h2v1H3zM4 4h2v1H4zM3 5h2v1H3zM2 6h2v1H2zM1 7h2v1H1zM0 8h2v1H0z"
            />
        </svg>
    );
}

/** A filled four-row triangle for a spinner's increment or decrement button. */
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

export { Chevron, Triangle };
