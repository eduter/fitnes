import { createEffect, createSignal, type JSX, onCleanup, Show, splitProps, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Button } from '../Button/Button.tsx';
import { controlClasses } from '../Controls/controlClasses.ts';
import { isTopModal, popModal, pushModal } from './modalStack.ts';
import { placePopover } from './placement.ts';
import '../../styles/controls.css';
import './Popover.css';

/** A controlled thin-bordered modal with PR 23's stepped reveal and reversed closing lifecycle. */
function Popover(props: PopoverProps): JSX.Element {
    const [local, rest] = splitProps(props, [
        'open',
        'onOpenChange',
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
        'placement',
        'class',
        'classList',
        'style',
    ]);
    const [phase, setPhase] = createSignal<PopoverPhase>('closed');
    const [height, setHeight] = createSignal(96);
    let panel: HTMLDivElement | undefined;
    let layer: HTMLDivElement | undefined;
    let opener: HTMLElement | undefined;
    let disposed = false;
    const stepPixels = () => local.stepPixels ?? 16;
    const steps = () => height() / stepPixels();
    const duration = () => `${(steps() * (local.framesPerStep ?? 2) * 1000) / 60}ms`;

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
        setHeight(Math.ceil(measured / stepPixels()) * stepPixels());
        setPhase('opening');
        queueMicrotask(() => {
            if (disposed || phase() === 'closed') {
                return;
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
                    reveal(Math.max(16, panel?.offsetHeight || 16));
                });
            }
        } else if (!open && current !== 'closed' && current !== 'closing') {
            setPhase('closing');
        }
    });

    /** Convert viewport placement back into the scaled portal's own coordinates. */
    function positionPanel(): void {
        if (!panel || !layer || phase() === 'closed') {
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
            left: Math.max(viewportLeft + margin, surface?.left ?? viewportLeft),
            right: Math.min(viewportLeft + viewportWidth - margin, surface?.right ?? viewportLeft + viewportWidth),
            top: viewportTop + margin,
            bottom: viewportTop + viewportHeight - margin,
        };
        const availableWidth = Math.max(16, (bounds.right - bounds.left) / scale);
        const availableHeight = Math.max(16, Math.floor((bounds.bottom - bounds.top) / scale));
        panel.style.inlineSize = `${Math.min(local.width ?? 240, availableWidth)}px`;
        panel.style.maxBlockSize = `${availableHeight}px`;
        const size = panel.getBoundingClientRect();
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
            placement: local.placement,
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
        if (
            event.target !== event.currentTarget ||
            (event.animationName && event.animationName !== 'nes-popover-reveal')
        ) {
            return;
        }
        if (phase() === 'opening') {
            setPhase('open');
            positionPanel();
            const target =
                local.initialFocus?.() ??
                panel?.querySelector<HTMLElement>('[data-popover-autofocus]') ??
                focusable()[0] ??
                panel;
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
        ].filter((element) => !element.closest('[hidden]'));
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
                        }}
                        onAnimationEnd={finishAnimation}
                        onKeyDown={handleKeys}
                    >
                        <div class="nes-popover__content" inert={phase() !== 'open'}>
                            {local.children}
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
    placement?: 'vertical' | 'right';
    style?: JSX.CSSProperties;
}

export type { PopoverPhase, PopoverProps };
export { Popover };
