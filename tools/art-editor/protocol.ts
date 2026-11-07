import type { Region } from './model.ts';

/** Browser configuration for the local-only editor. */
interface EditorConfig {
    token: string;
    baselineHash: string;
    emphasis: number;
    revision: number;
    pixels: string;
    lastVerified: string | null;
    updatedAt: number;
    emulatorReady: boolean;
    recoveryMessage: string;
    colors: { code: number; name: string; hex: string; rgb: number[]; group: 'current' | 'candidate' | 'other' }[];
}

/** Version-bound proof result; only verified means both exact checks passed. */
interface VerificationResult {
    revision: number;
    status: 'verified' | 'unverified' | 'emulator-unavailable' | 'superseded';
    reason: string;
    detail?: string;
    regions: Region[];
    elapsedMs: number;
    fromCache?: boolean;
    imageHash?: string;
}

export type { EditorConfig, VerificationResult };
