import { createEffect, createSignal, type JSX, onCleanup, onMount } from 'solid-js';
import { Button } from '../Button/Button.tsx';
import { Triangle } from '../Controls/Glyph.tsx';
import { refreshLock } from './refreshLock.ts';
import './PagedWindow.css';

/** Bounded pages with arrow and vertical-swipe navigation separated by a brief black redraw. */
function PagedWindow(props: PagedWindowProps): JSX.Element {
    const [redrawing, setRedrawing] = createSignal(false);
    let surface: HTMLElement | undefined;
    const owner = {};
    createEffect(() => refreshLock(owner, props.page > 1));
    onCleanup(() => refreshLock(owner, false));
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
            event.pointerType === 'touch' ||
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
    onMount(() => {
        let first: { x: number; y: number; time: number } | undefined;
        function startTouch(event: TouchEvent): void {
            first = undefined;
            if (
                event.touches.length !== 1 ||
                (event.target instanceof Element && event.target.closest('button,input,textarea,[role="dialog"]'))
            ) {
                return;
            }
            first = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: event.timeStamp };
        }
        function moveTouch(event: TouchEvent): void {
            if (!first || event.touches.length !== 1) {
                first = undefined;
                return;
            }
            const dy = event.touches[0].clientY - first.y;
            const dx = event.touches[0].clientX - first.x;
            if (Math.abs(dy) > Math.abs(dx) && (dy < 0 || props.page > 1)) {
                event.preventDefault();
            }
        }
        function endTouch(event: TouchEvent): void {
            const origin = first;
            first = undefined;
            if (!origin || !event.changedTouches.length || event.timeStamp - origin.time > 1200) {
                return;
            }
            const dy = event.changedTouches[0].clientY - origin.y;
            const dx = event.changedTouches[0].clientX - origin.x;
            if (Math.abs(dy) >= 32 && Math.abs(dy) > Math.abs(dx) * 1.25) {
                go(props.page + (dy < 0 ? 1 : -1));
            }
        }
        function cancelTouch(): void {
            first = undefined;
        }
        surface?.addEventListener('touchstart', startTouch, { passive: true });
        surface?.addEventListener('touchmove', moveTouch, { passive: false });
        surface?.addEventListener('touchend', endTouch);
        surface?.addEventListener('touchcancel', cancelTouch);
        onCleanup(() => {
            surface?.removeEventListener('touchstart', startTouch);
            surface?.removeEventListener('touchmove', moveTouch);
            surface?.removeEventListener('touchend', endTouch);
            surface?.removeEventListener('touchcancel', cancelTouch);
        });
    });
    return (
        <section
            class="nes-paged-window"
            ref={surface}
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
                    <Triangle direction="left" />
                </Button>
                <span
                    role="status"
                    aria-live="polite"
                    style={{ 'inline-size': `${(String(props.count).length * 2 + 4) * 7}px` }}
                >
                    <span style={{ 'inline-size': `${String(props.count).length * 7}px`, 'text-align': 'right' }}>
                        {props.page}
                    </span>
                    <span> of </span>
                    <span style={{ 'inline-size': `${String(props.count).length * 7}px`, 'text-align': 'right' }}>
                        {props.count}
                    </span>
                </span>
                <Button
                    variant="plain"
                    aria-label="Next page"
                    disabled={props.page >= props.count || redrawing()}
                    onPress={() => go(props.page + 1)}
                >
                    <Triangle direction="right" />
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
