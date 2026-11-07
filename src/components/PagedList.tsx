import { createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { PagedWindow } from './Controls/index.ts';

const rememberedPages = new Map<string, number>();

/** Fit fixed-height rows to the available page area, retaining the page across child routes. */
function PagedList<T>(props: PagedListProps<T>): JSX.Element {
    const [requested, setRequested] = createSignal(rememberedPages.get(props.label) ?? 1);
    const [height, setHeight] = createSignal(280);
    let surface: HTMLDivElement | undefined;
    onMount(() => {
        if (typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => setHeight(surface?.clientHeight ?? 280));
        if (surface) {
            observer.observe(surface);
        }
        onCleanup(() => observer.disconnect());
    });
    const size = () => Math.max(1, Math.floor((height() - 32) / (props.rowHeight ?? 72)));
    const count = () => Math.max(1, Math.ceil(props.items.length / size()));
    const page = () => Math.min(requested(), count());
    const visible = createMemo(() => props.items.slice((page() - 1) * size(), page() * size()));
    return (
        <div class="paged-list" ref={surface}>
            <PagedWindow
                label={props.label}
                page={page()}
                count={count()}
                onChange={(next) => {
                    setRequested(next);
                    rememberedPages.set(props.label, next);
                }}
            >
                <Show when={props.items.length} fallback={<p class="muted">{props.empty ?? 'Nothing here yet.'}</p>}>
                    <For each={visible()}>
                        {(item) => (
                            <div class="paged-list__row" style={{ height: `${props.rowHeight ?? 72}px` }}>
                                {props.children(item)}
                            </div>
                        )}
                    </For>
                </Show>
            </PagedWindow>
        </div>
    );
}
/** Page data and a consistent row size; pagination is never placed in a dialog. */
interface PagedListProps<T> {
    label: string;
    items: readonly T[];
    rowHeight?: number;
    empty?: string;
    children: (item: T) => JSX.Element;
}

export { PagedList };
