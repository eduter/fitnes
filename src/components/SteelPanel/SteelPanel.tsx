import { type JSX, splitProps } from 'solid-js';
import './SteelPanel.css';

/** A content-sized steel frame with a two-pixel black surround and ordinary div attributes. */
function SteelPanel(props: SteelPanelProps): JSX.Element {
    const [local, rest] = splitProps(props, ['children', 'class', 'classList']);

    return (
        <div {...rest} class={panelClasses(local)}>
            <div class="steel-panel__frame">{local.children}</div>
        </div>
    );
}

/** Merge caller classes once so updates cannot clobber flags or the required frame class. */
function panelClasses(props: Pick<SteelPanelProps, 'class' | 'classList'>): string {
    const { class: className, classList } = props;
    const classes = new Set((className ?? '').split(/\s+/).filter(Boolean));
    for (const [group, enabled] of Object.entries(classList ?? {})) {
        for (const name of group.split(/\s+/).filter(Boolean)) {
            if (enabled) {
                classes.add(name);
            } else {
                classes.delete(name);
            }
        }
    }
    classes.add('steel-panel');
    return [...classes].join(' ');
}

/** Props forwarded to the outer panel; size and layout belong to the caller's CSS. */
interface SteelPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export { SteelPanel };
export type { SteelPanelProps };
