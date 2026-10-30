import type { JSX } from 'solid-js';

const PATTERNS: Record<string, string[]> = {
    home: ['00011000', '00111100', '01111110', '11111111', '01111110', '01100110', '01100110', '01100110'],
    plan: ['01111110', '01000010', '01011010', '01000010', '01011010', '01000010', '01111110', '00000000'],
    move: ['00000000', '11000011', '11100111', '11111111', '11111111', '11100111', '11000011', '00000000'],
    body: ['00111100', '01000010', '01011010', '01011010', '01000010', '01000010', '01111110', '00000000'],
    history: ['00011000', '00111100', '01011010', '01011010', '01011110', '01000010', '00111100', '00000000'],
};

/** Draw navigation symbols on an integer grid without introducing extra palette colors. */
function NavIcon(props: { name: string }): JSX.Element {
    const path = () =>
        (PATTERNS[props.name] ?? PATTERNS.home)
            .flatMap((row, y) => [...row].flatMap((value, x) => (value === '1' ? [`M${x} ${y}h1v1h-1z`] : [])))
            .join('');
    return (
        <svg
            class="app-tabs__icon"
            width="16"
            height="16"
            viewBox="0 0 8 8"
            aria-hidden="true"
            shape-rendering="crispEdges"
        >
            <path d={path()} fill="currentColor" />
        </svg>
    );
}

export { NavIcon };
