import type { JSX } from 'solid-js';

interface PixelIconProps {
    /** Rows of `.` (empty), `1` (black), `2` (fill), and `3` (gold). Every row is the same length. */
    rows: readonly string[];
    /** Logical pixels each source pixel covers. Defaults to 1. */
    pixel?: number;
}

interface LitPixel {
    x: number;
    y: number;
    fill: string;
}

/**
 * Draw a bitmap with one rectangle per lit pixel.
 * The fill follows the surrounding text color, so the active tab turns the body gold
 * while the black outline stays put.
 */
function PixelIcon(props: PixelIconProps): JSX.Element {
    const pixel = () => props.pixel ?? 1;
    const size = () => props.rows.length * pixel();

    return (
        <svg
            class="pixel-icon"
            viewBox={`0 0 ${size()} ${size()}`}
            width={`calc(var(--px) * ${size()})`}
            height={`calc(var(--px) * ${size()})`}
            aria-hidden="true"
            shape-rendering="crispEdges"
        >
            {litPixels(props.rows, pixel()).map((cell) => (
                <rect x={cell.x} y={cell.y} width={pixel()} height={pixel()} fill={cell.fill} />
            ))}
        </svg>
    );
}

/** Skip empty cells so the pane color shows through. */
function litPixels(rows: readonly string[], pixel: number): LitPixel[] {
    const cells: LitPixel[] = [];

    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const ink = row[x];
            if (ink === '.' || ink === undefined) {
                continue;
            }

            cells.push({
                x: x * pixel,
                y: y * pixel,
                fill: ink === '1' ? 'var(--nes-black)' : ink === '3' ? 'var(--nes-gold)' : 'currentColor',
            });
        }
    });

    return cells;
}

export { PixelIcon };
