import { createSignal } from 'solid-js';
import type { WorkoutCue } from './workoutCue.ts';

const volumeKey = 'fitnes-sfx-volume';
const [sfxVolume, setVolume] = createSignal(readVolume());
let context: AudioContext | undefined;
let master: GainNode | undefined;
let effectRevision = 0;
const voices = new Set<OscillatorNode>();

/** Persist a global percentage in ten-point increments and immediately apply it to active effects. */
function setSfxVolume(value: number): void {
    if (!Number.isFinite(value)) {
        return;
    }
    const volume = Math.max(0, Math.min(100, Math.round(value / 10) * 10));
    setVolume(volume);
    if (master && context) {
        master.gain.setValueAtTime(volume / 100, context.currentTime);
    }
    if (volume === 0) {
        stopAll();
    }
    try {
        localStorage.setItem(volumeKey, String(volume));
    } catch {
        // Device settings still work in memory when storage is unavailable
    }
}

/** Unlock browser audio from the same gesture that activates the control. */
function prepareSfx(): void {
    if (typeof AudioContext === 'undefined') {
        return;
    }
    try {
        if (!context || context.state === 'closed') {
            context = new AudioContext();
            master = context.createGain();
            master.gain.value = sfxVolume() / 100;
            master.connect(context.destination);
        }
        if (context.state === 'suspended') {
            void context.resume().catch(stopAll);
        }
    } catch {
        // Unsupported or denied audio must never prevent a workout action
    }
}

/** Play the approved selection chirp unless this action opens or closes a window. */
function activateWithSfx(action: () => unknown): void {
    prepareSfx();
    const revision = effectRevision;
    const result = action();
    void Promise.resolve(result).then(
        () => {
            // Solid flushes window state and its measurement microtask before choosing the button cue
            queueMicrotask(() => {
                if (revision === effectRevision) {
                    playSfx('select');
                }
            });
        },
        () => undefined
    );
}

/** Mark a window transition before its animation starts, preventing a duplicate selection cue. */
function noteDialogChange(): void {
    effectRevision++;
}

/** Play an original synthesized cue through the shared volume control. */
function playSfx(cue: WorkoutCue | 'select'): void {
    effectRevision++;
    const output = audioOutput();
    if (!output) {
        return;
    }
    const notes =
        cue === 'select'
            ? [740, 1100]
            : cue === 'prepare'
              ? [660]
              : cue === 'tick'
                ? [880]
                : cue === 'start'
                  ? [523, 784, 1046]
                  : [523, 659, 784];
    const duration = cue === 'select' ? 0.07 : cue === 'start' ? 0.21 : cue === 'complete' ? 0.24 : 0.045;
    const amplitude = cue === 'select' ? 0.08 : 0.045;
    const { context } = output;
    const start = context.currentTime;
    notes.forEach((hz, index) => {
        const time = start + (index * duration) / notes.length;
        const end = start + ((index + 1) * duration) / notes.length;
        const voice = createVoice(output, time, end, amplitude, cue === 'select' ? 0.003 : 0.002);
        voice.oscillator.frequency.value = hz;
        voice.oscillator.start(time);
        voice.oscillator.stop(end);
    });
}

/** Sustain the provisional 473–1937 Hz sweep for exactly one window animation. */
function playDialogSfx(duration: number, closing: boolean): () => void {
    const output = audioOutput();
    if (!output || !Number.isFinite(duration) || duration < 0.01) {
        return () => undefined;
    }
    const { context } = output;
    const start = context.currentTime;
    const end = start + duration;
    const { oscillator, gain } = createVoice(output, start, end, 0.028, Math.min(0.012, duration / 4), true);
    const updates = Math.max(1, Math.ceil(duration * 240));
    for (let index = 0; index <= updates; index++) {
        const progress = index / updates;
        const hz = 473 * (1937 / 473) ** (closing ? 1 - progress : progress);
        const timer = Math.round(1789773 / (16 * hz) - 1);
        oscillator.frequency.setValueAtTime(1789773 / (16 * (timer + 1)), start + progress * duration);
    }
    oscillator.start(start);
    oscillator.stop(end);
    return () => {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(0, context.currentTime);
        oscillator.stop();
    };
}

function audioOutput(): AudioOutput | undefined {
    if (sfxVolume() === 0 || !context || !master || context.state === 'closed') {
        return undefined;
    }
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') {
        return undefined;
    }
    return { context, master };
}

interface AudioOutput {
    context: AudioContext;
    master: GainNode;
}

function createVoice(
    output: AudioOutput,
    start: number,
    end: number,
    amplitude: number,
    fade: number,
    filtered = false
): {
    oscillator: OscillatorNode;
    gain: GainNode;
} {
    const { context, master } = output;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(amplitude, start + fade);
    gain.gain.setValueAtTime(amplitude, end - fade);
    gain.gain.linearRampToValueAtTime(0, end);
    const filter = filtered ? context.createBiquadFilter() : undefined;
    if (filter) {
        filter.type = 'lowpass';
        filter.frequency.value = 1800;
        filter.Q.value = 0.5;
        oscillator.connect(filter);
        filter.connect(gain);
    } else {
        oscillator.connect(gain);
    }
    gain.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => {
        voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
        filter?.disconnect();
    };
    return { oscillator, gain };
}

function stopAll(): void {
    for (const voice of voices) {
        voice.stop();
    }
    voices.clear();
}

function readVolume(): number {
    try {
        const raw = localStorage.getItem(volumeKey);
        const value = raw === null ? 100 : Number(raw);
        return Number.isFinite(value) && value >= 0 && value <= 100 && value % 10 === 0 ? value : 100;
    } catch {
        return 100;
    }
}

export { sfxVolume, setSfxVolume, prepareSfx, activateWithSfx, noteDialogChange, playSfx, playDialogSfx };
