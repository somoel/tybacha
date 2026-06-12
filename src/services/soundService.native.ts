import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { SoundVariant } from '@/src/types/battery.types';

type CueVariant = SoundVariant;

const SOURCES: Record<CueVariant, ReturnType<typeof require>> = {
    bell:  require('@/assets/sounds/cue-bell.wav'),
    chime: require('@/assets/sounds/cue-chime.wav'),
    end:   require('@/assets/sounds/test-end.wav'),
};

const VOLUMES: Record<CueVariant, number> = {
    bell:  0.4,
    chime: 0.3,
    end:   0.5,
};

const players = new Map<CueVariant, AudioPlayer>();
let audioModeConfigured = false;

async function ensureAudioMode(): Promise<void> {
    if (audioModeConfigured) return;
    audioModeConfigured = true;
    try {
        await setAudioModeAsync({
            playsInSilentMode: false,
            interruptionMode: 'mixWithOthers',
            shouldPlayInBackground: false,
        });
    } catch {
        // Web and some platforms may not support every option; safe to ignore.
    }
}

function ensurePlayer(variant: CueVariant): AudioPlayer | null {
    const existing = players.get(variant);
    if (existing) return existing;
    try {
        const p = createAudioPlayer(SOURCES[variant]);
        p.volume = VOLUMES[variant];
        p.pause();
        players.set(variant, p);
        return p;
    } catch {
        return null;
    }
}

export function setMuted(value: boolean): void {
    muted = value;
}

let muted = false;

export function isMuted(): boolean {
    return muted;
}

export async function preloadCue(): Promise<void> {
    await ensureAudioMode();
    for (const variant of ['bell', 'chime', 'end'] as CueVariant[]) {
        ensurePlayer(variant);
    }
}

export async function playCue(variant: CueVariant = 'bell'): Promise<void> {
    if (muted) return;
    const p = ensurePlayer(variant);
    if (!p) return;
    try {
        await p.seekTo(0);
        p.play();
    } catch {
        // Ignore playback errors (e.g. autoplay blocked on web before user gesture)
    }
    try {
        await Haptics.selectionAsync();
    } catch {
        // Haptics not available on web/desktop
    }
}
