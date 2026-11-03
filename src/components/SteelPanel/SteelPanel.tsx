import { type JSX, splitProps } from 'solid-js';
import './SteelPanel.css';

/** A content-sized steel frame with a two-pixel black surround and ordinary div attributes. */
function SteelPanel(props: SteelPanelProps): JSX.Element {
    const [local, rest] = splitProps(props, ['children', 'class']);

    return (
        <div {...rest} class={`steel-panel${local.class ? ` ${local.class}` : ''}`}>
            <div class="steel-panel__frame">{local.children}</div>
        </div>
    );
}

/** Props forwarded to the outer panel; size and layout belong to the caller's CSS. */
interface SteelPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export { SteelPanel };
export type { SteelPanelProps };
