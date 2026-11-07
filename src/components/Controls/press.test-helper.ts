import { fireEvent } from '@solidjs/testing-library';

/** Dispatch primary press plus its generated click, matching one complete pointer activation. */
function press(button: HTMLElement): void {
    const event = new MouseEvent('pointerdown', { bubbles: true, button: 0 });
    Object.defineProperty(event, 'isPrimary', { value: true });
    fireEvent(button.querySelector('.nes-button__label') ?? button, event);
    fireEvent.click(button, { detail: 1 });
}

export { press };
