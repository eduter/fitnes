import { createSignal } from 'solid-js';
import type { WorkoutCue } from './workoutCue.ts';

const volumeKey = 'fitnes-sfx-volume';
const [sfxVolume, setVolume] = createSignal(readVolume());
let context: AudioContext | undefined;
let master: GainNode | undefined;
const voices = new Set<OscillatorNode>();

/** Persist the workout cue percentage in ten-point increments and immediately apply it to active effects. */
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

/** Play an original synthesized cue through the shared volume control. */
function playSfx(cue: WorkoutCue): void {
    const output = audioOutput();
    if (!output) {
        return;
    }
    const notes =
        cue === 'prepare' ? [660] : cue === 'tick' ? [880] : cue === 'start' ? [523, 784, 1046] : [523, 659, 784];
    const duration = cue === 'start' ? 0.21 : cue === 'complete' ? 0.24 : 0.045;
    const { context } = output;
    const start = context.currentTime;
    notes.forEach((hz, index) => {
        const time = start + (index * duration) / notes.length;
        const end = start + ((index + 1) * duration) / notes.length;
        const voice = createVoice(output, time, end);
        voice.oscillator.frequency.value = hz;
        voice.oscillator.start(time);
        voice.oscillator.stop(end);
    });
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
    end: number
): {
    oscillator: OscillatorNode;
    gain: GainNode;
} {
    const { context, master } = output;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.002);
    gain.gain.setValueAtTime(0.045, end - 0.002);
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(gain);
    gain.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => {
        voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
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

export { sfxVolume, setSfxVolume, prepareSfx, playSfx };
