import { createEffect, createSignal, type JSX, onCleanup, Show, splitProps, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Button } from '../Button/Button.tsx';
import { controlClasses } from '../Controls/controlClasses.ts';
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
        'stepPixels',
        'framesPerStep',
        'initialFocus',
        'returnFocus',
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
    const inertElements = new Map<HTMLElement, boolean>();
    const stepPixels = () => local.stepPixels ?? 16;
    const steps = () => height() / stepPixels();
    const duration = () => `${(steps() * (local.framesPerStep ?? 2) * 1000) / 60}ms`;

    function restoreBackground(): void {
        for (const [element, previous] of inertElements) {
            element.toggleAttribute('inert', previous);
        }
        inertElements.clear();
    }

    function isolateBackground(): void {
        const host = local.mount ?? document.body;
        for (const element of host.children) {
            if (!(element instanceof HTMLElement) || element.contains(layer ?? null) || inertElements.has(element)) {
                continue;
            }
            inertElements.set(element, element.hasAttribute('inert'));
            element.setAttribute('inert', '');
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
                    reveal(Math.max(16, panel?.getBoundingClientRect().height ?? 16));
                });
            }
        } else if (!open && current !== 'closed' && current !== 'closing') {
            setPhase('closing');
        }
    });

    function finishAnimation(event: AnimationEvent): void {
        if (
            event.target !== event.currentTarget ||
            (event.animationName && event.animationName !== 'nes-popover-reveal')
        ) {
            return;
        }
        if (phase() === 'opening') {
            setPhase('open');
            const target =
                local.initialFocus?.() ??
                panel?.querySelector<HTMLElement>('[data-popover-autofocus]') ??
                focusable()[0] ??
                panel;
            target?.focus({ preventScroll: true });
        } else if (phase() === 'closing') {
            setPhase('closed');
            restoreBackground();
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
                        aria-label={`Dismiss ${local.label}`}
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
    stepPixels?: number;
    framesPerStep?: 1 | 2;
    initialFocus?: () => HTMLElement | undefined;
    returnFocus?: () => HTMLElement | undefined;
    style?: JSX.CSSProperties;
}

export { Popover };
export type { PopoverProps, PopoverPhase };
