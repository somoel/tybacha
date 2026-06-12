import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let muted = false;
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

async function ensurePlayer(): Promise<AudioPlayer | null> {
    if (player) return player;
    try {
        await ensureAudioMode();
        const p = createAudioPlayer(require('@/assets/sounds/cue-chime.wav'));
        p.volume = 0.4;
        p.pause();
        player = p;
        return player;
    } catch {
        return null;
    }
}

export function setMuted(value: boolean): void {
    muted = value;
}

export function isMuted(): boolean {
    return muted;
}

export async function preloadCue(): Promise<void> {
    await ensurePlayer();
}

export async function playCue(): Promise<void> {
    if (muted) return;
    const p = await ensurePlayer();
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
