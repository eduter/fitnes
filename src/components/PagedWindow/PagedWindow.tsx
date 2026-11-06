import { createSignal, type JSX, onCleanup } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import './PagedWindow.css';

/** Bounded pages with arrow and vertical-swipe navigation separated by a brief black redraw. */
function PagedWindow(props: PagedWindowProps): JSX.Element {
    const [redrawing, setRedrawing] = createSignal(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let gesture: { id: number; x: number; y: number; time: number } | undefined;
    onCleanup(() => clearTimeout(timer));
    function go(next: number): void {
        if (redrawing() || next < 1 || next > props.count || next === props.page) {
            return;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            props.onChange(next);
            return;
        }
        setRedrawing(true);
        timer = setTimeout(() => {
            props.onChange(next);
            setRedrawing(false);
        }, 80);
    }
    function start(event: PointerEvent): void {
        gesture = undefined;
        if (
            !event.isPrimary ||
            event.button !== 0 ||
            (event.target instanceof Element && event.target.closest('button,input,textarea,[role="dialog"]'))
        ) {
            return;
        }
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
        event.currentTarget && (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    function finish(event: PointerEvent): void {
        const first = gesture;
        gesture = undefined;
        if (!first || first.id !== event.pointerId || event.timeStamp - first.time > 1200) {
            return;
        }
        const y = event.clientY - first.y;
        if (Math.abs(y) < 32 || Math.abs(y) < Math.abs(event.clientX - first.x) * 1.25) {
            return;
        }
        go(props.page + (y < 0 ? 1 : -1));
    }
    return (
        <section
            class="nes-paged-window"
            aria-label={props.label}
            onPointerDown={start}
            onPointerUp={finish}
            onPointerCancel={() => {
                gesture = undefined;
            }}
            data-redrawing={redrawing() ? '' : undefined}
            aria-busy={redrawing()}
        >
            <div class="nes-paged-window__content" inert={redrawing()}>
                {props.children}
            </div>
            <footer class="nes-pagination">
                <Button
                    variant="plain"
                    aria-label="Previous page"
                    disabled={props.page <= 1 || redrawing()}
                    onPress={() => go(props.page - 1)}
                >
                    {'<'}
                </Button>
                <span role="status" aria-live="polite">
                    {props.page} of {props.count}
                </span>
                <Button
                    variant="plain"
                    aria-label="Next page"
                    disabled={props.page >= props.count || redrawing()}
                    onPress={() => go(props.page + 1)}
                >
                    {'>'}
                </Button>
            </footer>
            <div class="nes-paged-window__black" aria-hidden="true" />
        </section>
    );
}
/** Page is one-based; callers supply the current bounded content and own selection. */
interface PagedWindowProps {
    label: string;
    page: number;
    count: number;
    onChange: (page: number) => void;
    children: JSX.Element;
}

export type { PagedWindowProps };
export { PagedWindow };
