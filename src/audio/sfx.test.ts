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
}
beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    oscillators.length = 0;
    gains.length = 0;
    vi.stubGlobal('AudioContext', AudioMock);
});
afterEach(() => vi.unstubAllGlobals());

it('applies persisted workout volume, updates live audio and mutes every kind of cue', async () => {
    localStorage.setItem('fitnes-sfx-volume', '30');
    const sfx = await import('./sfx.ts');
    sfx.prepareSfx();
    sfx.playSfx('start');
    expect(gains[0].gain.value).toBe(0.3);
    expect(oscillators.map((node) => node.frequency.value)).toEqual([523, 784, 1046]);
    sfx.setSfxVolume(60);
    expect(gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0.6, 10);
    sfx.setSfxVolume(0);
    expect(oscillators.every((node) => node.stop.mock.calls.length === 2)).toBe(true);
    for (const cue of ['prepare', 'start', 'tick', 'complete'] as const) {
        sfx.playSfx(cue);
    }
    expect(oscillators).toHaveLength(3);
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
it('keeps workout cues optional when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const sfx = await import('./sfx.ts');
    expect(() => {
        sfx.prepareSfx();
        sfx.playSfx('start');
    }).not.toThrow();
    expect(oscillators).toHaveLength(0);
});
