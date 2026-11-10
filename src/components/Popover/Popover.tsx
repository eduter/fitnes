import { createEffect, createSignal, type JSX, onCleanup, Show, splitProps, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useDialogHistory } from '../../routing/dialogHistory.ts';
import { Button } from '../Button/Button.tsx';
import { controlClasses } from '../Controls/controlClasses.ts';
import { isTopModal, popModal, pushModal } from './modalStack.ts';
import { placePopover } from './placement.ts';
import '../../styles/controls.css';
import './Popover.css';

/** A stepped modal viewport around a fixed, opaque frame; closing retains the complete content. */
function Popover(props: PopoverProps): JSX.Element {
    const [local, rest] = splitProps(props, [
        'open',
        'onOpenChange',
        'closeOnBack',
        'label',
        'children',
        'mount',
        'height',
        'width',
        'stepPixels',
        'framesPerStep',
        'initialFocus',
        'returnFocus',
        'anchor',
        'class',
        'classList',
        'style',
    ]);
    const [phase, setPhase] = createSignal<PopoverPhase>('closed');
    const [height, setHeight] = createSignal(96);
    const [closingHeight, setClosingHeight] = createSignal(96);
    let panel: HTMLDivElement | undefined;
    let frame: HTMLDivElement | undefined;
    let layer: HTMLDivElement | undefined;
    let opener: HTMLElement | undefined;
    let disposed = false;
    let requestedHeight = 96;
    let availableHeight = Number.POSITIVE_INFINITY;
    const stepPixels = () => local.stepPixels ?? 16;
    const steps = () => Math.max(1, Math.ceil((phase() === 'closing' ? closingHeight() : height()) / stepPixels()));
    const duration = () => `${(steps() * (local.framesPerStep ?? 2) * 1000) / 60}ms`;

    useDialogHistory({
        open: () => local.open && local.closeOnBack !== false,
        onClose: () => local.onOpenChange(false),
    });

    function restoreBackground(): void {
        if (layer) {
            popModal(layer);
        }
    }

    function isolateBackground(): void {
        if (layer) {
            pushModal(layer);
        }
    }

    function reveal(measured: number): void {
        if (!Number.isInteger(stepPixels()) || stepPixels() < 1 || !Number.isFinite(measured) || measured <= 0) {
            throw new Error('Popover requires a positive height and positive integer stepPixels');
        }
        requestedHeight = measured;
        fitHeight();
        setPhase('opening');
        queueMicrotask(() => {
            if (disposed || phase() === 'closed') {
                return;
            }
            if (panel?.querySelector('.nes-paged-window')) {
                throw new Error('Pagination belongs on the page, never inside a Popover');
            }
            isolateBackground();
            positionPanel();
            document.addEventListener('pointerdown', dismissOutside, true);
            window.addEventListener('resize', positionPanel);
            window.addEventListener('scroll', positionPanel, true);
            window.visualViewport?.addEventListener('resize', positionPanel);
            window.visualViewport?.addEventListener('scroll', positionPanel);
            if (phase() === 'opening') {
                panel?.focus({ preventScroll: true });
            }
        });
    }

    createEffect(() => {
        const open = local.open;
        const current = untrack(phase);
        if (open && (current === 'closed' || current === 'closing')) {
            if (current === 'closed') {
                opener =
                    local.returnFocus?.() ??
                    local.anchor?.() ??
                    (document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
            }
            if (local.height !== undefined) {
                reveal(local.height);
            } else {
                setPhase('measuring');
                queueMicrotask(() => {
                    if (disposed || phase() !== 'measuring') {
                        return;
                    }
                    positionPanel();
                    reveal(Math.max(16, frame?.offsetHeight || 16));
                });
            }
        } else if (!open && current !== 'closed' && current !== 'closing') {
            // Reverse from the visible step if dismissal interrupts opening, without resizing the frame.
            const visible = panel?.offsetHeight ?? height();
            setClosingHeight(Math.ceil(visible / stepPixels()) * stepPixels());
            setPhase('closing');
        }
    });

    /** Resolve one whole-step frame height, rather than clipping a larger painted border with CSS max-height. */
    function fitHeight(): void {
        const rounded = Math.ceil(requestedHeight / stepPixels()) * stepPixels();
        const limit = Math.floor(availableHeight / stepPixels()) * stepPixels();
        setHeight(Math.min(rounded, limit > 0 ? limit : availableHeight));
    }

    /** Convert viewport placement back into the scaled portal's own coordinates. */
    function positionPanel(event?: Event): void {
        if (!panel || !frame || !layer || phase() === 'closed') {
            return;
        }
        // Scrolling this form does not move its anchor; only an outer scroll can change placement.
        if (event?.type === 'scroll' && event.target instanceof Node && panel.contains(event.target)) {
            return;
        }
        const layerRect = layer.getBoundingClientRect();
        const scale = layer.offsetWidth > 0 ? layerRect.width / layer.offsetWidth : 1;
        if (scale <= 0) {
            return;
        }

        // Use the visual viewport so a phone keyboard or a scrolled page cannot hide the menu
        const visible = window.visualViewport;
        const viewportLeft = visible?.offsetLeft ?? 0;
        const viewportTop = visible?.offsetTop ?? 0;
        const viewportWidth = visible?.width ?? window.innerWidth;
        const viewportHeight = visible?.height ?? window.innerHeight;
        const surface = local.mount?.getBoundingClientRect();
        const margin = 8 * scale;
        const bounds = {
            left: Math.max(viewportLeft + margin, surface ? surface.left + margin : viewportLeft),
            right: Math.min(
                viewportLeft + viewportWidth - margin,
                surface ? surface.right - margin : viewportLeft + viewportWidth
            ),
            top: viewportTop + margin,
            bottom: viewportTop + viewportHeight - margin,
        };
        const availableWidth = Math.max(16, (bounds.right - bounds.left) / scale);
        availableHeight = Math.max(16, Math.floor((bounds.bottom - bounds.top) / scale));
        panel.style.inlineSize = `${Math.min(local.width ?? 224, availableWidth)}px`;
        if (phase() !== 'measuring') {
            fitHeight();
        }
        // Placement must use the complete frame, never the animated viewport height.
        const size = frame.getBoundingClientRect();
        const trigger = local.anchor?.() ?? opener;
        const anchor = trigger?.getBoundingClientRect();
        const fallback = {
            left: bounds.left,
            right: bounds.right,
            top: (bounds.top + bounds.bottom - size.height) / 2,
            bottom: (bounds.top + bounds.bottom - size.height) / 2,
        };
        const position = placePopover({
            anchor: anchor ?? fallback,
            viewport: bounds,
            width: size.width,
            height: size.height,
            gap: anchor ? 4 * scale : 0,
        });
        panel.style.left = `${Math.round((position.left - layerRect.left) / scale)}px`;
        panel.style.top = `${Math.round((position.top - layerRect.top) / scale)}px`;
        panel.dataset.side = anchor ? position.side : 'center';
    }

    function dismissOutside(event: PointerEvent): void {
        if (!layer || !isTopModal(layer) || phase() === 'closing' || !event.isPrimary || event.button !== 0) {
            return;
        }
        if (event.target instanceof Node && panel?.contains(event.target)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        local.onOpenChange(false);
    }

    function stopPositioning(): void {
        document.removeEventListener('pointerdown', dismissOutside, true);
        window.removeEventListener('resize', positionPanel);
        window.removeEventListener('scroll', positionPanel, true);
        window.visualViewport?.removeEventListener('resize', positionPanel);
        window.visualViewport?.removeEventListener('scroll', positionPanel);
    }

    function finishAnimation(event: AnimationEvent): void {
        // A queued completion from opening must not finish a newly started close, or vice versa.
        const expected = phase() === 'closing' ? 'nes-popover-hide' : 'nes-popover-reveal';
        if (event.target !== event.currentTarget || (event.animationName && event.animationName !== expected)) {
            return;
        }
        if (phase() === 'opening') {
            setPhase('open');
            positionPanel();
            const target =
                local.initialFocus?.() ?? panel?.querySelector<HTMLElement>('[data-popover-autofocus]') ?? panel;
            target?.focus({ preventScroll: true });
        } else if (phase() === 'closing') {
            setPhase('closed');
            restoreBackground();
            stopPositioning();
            if (opener?.isConnected) {
                opener.focus({ preventScroll: true });
            }
        }
    }

    function focusable(): HTMLElement[] {
        return [
            ...(panel?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
            ) ?? []),
        ].filter((element) => element.tabIndex >= 0 && !element.closest('[hidden]'));
    }

    function handleKeys(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            local.onOpenChange(false);
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }
        const items = phase() === 'open' ? focusable() : [];
        event.preventDefault();
        if (!items.length) {
            panel?.focus({ preventScroll: true });
            return;
        }
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index + 1) % items.length;
        items[next]?.focus();
    }

    onCleanup(() => {
        disposed = true;
        stopPositioning();
        restoreBackground();
        if (phase() !== 'closed' && opener?.isConnected) {
            opener.focus({ preventScroll: true });
        }
    });

    return (
        <Show when={phase() !== 'closed'}>
            <Portal mount={local.mount}>
                <div ref={layer} class="nes-popover-layer" data-local={local.mount ? '' : undefined}>
                    <Button
                        class="nes-popover__backdrop"
                        variant="plain"
                        tabindex="-1"
                        aria-hidden="true"
                        aria-label="Dismiss window"
                        onPress={() => local.onOpenChange(false)}
                    />
                    <div
                        {...rest}
                        ref={panel}
                        class={controlClasses('nes-popover nes-control', local)}
                        role="dialog"
                        aria-modal="true"
                        aria-label={local.label}
                        tabindex="-1"
                        data-phase={phase()}
                        style={{
                            ...local.style,
                            'block-size': phase() === 'measuring' ? 'auto' : `${height()}px`,
                            '--nes-popover-steps': String(steps()),
                            '--nes-popover-duration': duration(),
                            '--nes-popover-height': `${height()}px`,
                            '--nes-popover-close-height': `${closingHeight()}px`,
                        }}
                        onAnimationEnd={finishAnimation}
                        onKeyDown={handleKeys}
                    >
                        <div
                            ref={frame}
                            class="nes-popover__frame nes-frame"
                            style={{ 'block-size': phase() === 'measuring' ? 'auto' : `${height()}px` }}
                        >
                            <div class="nes-popover__content" inert={phase() !== 'open'}>
                                {local.children}
                            </div>
                        </div>
                    </div>
                </div>
            </Portal>
        </Show>
    );
}

/** Modal phase: closing stays mounted and inert until the reverse animation finishes. */
type PopoverPhase = 'closed' | 'measuring' | 'opening' | 'open' | 'closing';

/** Children live in a portal; mount inside a positioned logical-pixel surface when it is scaled. */
interface PopoverProps
    extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'style' | 'onAnimationEnd' | 'onKeyDown' | 'ref'> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Whether the browser Back button dismisses this window. Defaults to true. */
    closeOnBack?: boolean;
    label: string;
    children: JSX.Element;
    mount?: HTMLElement;
    height?: number;
    width?: number;
    stepPixels?: number;
    framesPerStep?: 1 | 2;
    initialFocus?: () => HTMLElement | undefined;
    returnFocus?: () => HTMLElement | undefined;
    anchor?: () => HTMLElement | undefined;
    style?: JSX.CSSProperties;
}

export type { PopoverPhase, PopoverProps };
export { Popover };
