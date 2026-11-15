// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

function parameter() {
    return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() };
}
const oscillators: ReturnType<typeof oscillator>[] = [];
const gains: ReturnType<typeof gain>[] = [];
function oscillator() {
    return {
        frequency: parameter(),
        type: '',
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: undefined,
    };
}
function gain() {
    return { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() };
}
class AudioMock {
    currentTime = 10;
    state = 'running';
    destination = {};
    resume = vi.fn(async () => undefined);
    createOscillator() {
        const node = oscillator();
        oscillators.push(node);
        return node;
    }
    createGain() {
        const node = gain();
        gains.push(node);
        return node;
    }
    createBiquadFilter() {
        return { type: '', frequency: parameter(), Q: parameter(), connect: vi.fn(), disconnect: vi.fn() };
    }
}
beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    oscillators.length = 0;
    gains.length = 0;
    vi.stubGlobal('AudioContext', AudioMock);
});
afterEach(() => vi.unstubAllGlobals());

it('applies persisted global gain, updates live audio and mutes every kind of cue', async () => {
    localStorage.setItem('fitnes-sfx-volume', '30');
    const sfx = await import('./sfx.ts');
    sfx.prepareSfx();
    sfx.playSfx('select');
    expect(gains[0].gain.value).toBe(0.3);
    expect(oscillators.map((node) => node.frequency.value)).toEqual([740, 1100]);
    sfx.setSfxVolume(60);
    expect(gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0.6, 10);
    sfx.setSfxVolume(0);
    expect(oscillators.every((node) => node.stop.mock.calls.length === 2)).toBe(true);
    for (const cue of ['select', 'prepare', 'start', 'tick', 'complete'] as const) {
        sfx.playSfx(cue);
    }
    sfx.playDialogSfx(0.6, false);
    expect(oscillators).toHaveLength(2);
    expect(localStorage.getItem('fitnes-sfx-volume')).toBe('0');
});
it('persists bounded ten-point volume changes including full volume', async () => {
    const sfx = await import('./sfx.ts');
    sfx.setSfxVolume(16);
    expect(sfx.sfxVolume()).toBe(20);
    sfx.setSfxVolume(105);
    expect(sfx.sfxVolume()).toBe(100);
    sfx.setSfxVolume(-10);
    expect(sfx.sfxVolume()).toBe(0);
    sfx.setSfxVolume(Number.NaN);
    expect(sfx.sfxVolume()).toBe(0);
});
it('keeps a dialog sweep continuous and tied to the supplied duration in either direction', async () => {
    const sfx = await import('./sfx.ts');
    sfx.prepareSfx();
    const stop = sfx.playDialogSfx(0.6, false);
    expect(oscillators).toHaveLength(1);
    const pitches = oscillators[0].frequency.setValueAtTime.mock.calls;
    expect(pitches[0][0]).toBeCloseTo(473, -1);
    expect(pitches.at(-1)?.[0]).toBeCloseTo(1937, -2);
    expect(oscillators[0].stop).toHaveBeenCalledWith(10.6);
    stop();
    expect(gains[1].gain.cancelScheduledValues).toHaveBeenCalledWith(10);
    sfx.playDialogSfx(0.2, true);
    const reverse = oscillators[1].frequency.setValueAtTime.mock.calls;
    expect(reverse[0][0]).toBeGreaterThan(reverse.at(-1)![0]);
    sfx.playDialogSfx(0.001, false);
    expect(oscillators).toHaveLength(2);
});
it('avoids a duplicate selection cue for dialog changes and immediate workout cues', async () => {
    const sfx = await import('./sfx.ts');
    sfx.activateWithSfx(() => sfx.noteDialogChange());
    await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));
    expect(oscillators).toHaveLength(0);
    sfx.activateWithSfx(() => sfx.playSfx('prepare'));
    await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));
    expect(oscillators).toHaveLength(1);
    sfx.activateWithSfx(() => undefined);
    await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));
    expect(oscillators).toHaveLength(3);
});
it('keeps controls functional when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const sfx = await import('./sfx.ts');
    const action = vi.fn();
    sfx.activateWithSfx(action);
    await Promise.resolve();
    expect(action).toHaveBeenCalledOnce();
    expect(oscillators).toHaveLength(0);
});
