import type { EncouragementCue, SoundVariant, TimerMode } from '@/src/types/battery.types';
import { playCue, preloadCue, setMuted } from '@/src/services/soundService';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface TimerDisplayProps {
    mode: TimerMode;
    initialSeconds?: number;
    onComplete?: (elapsedSeconds: number) => void;
    onTick?: (seconds: number) => void;
    encouragementCues?: EncouragementCue[];
    soundCues?: boolean;
    endSound?: SoundVariant;
    disabled?: boolean;
}

/**
 * Large timer display for SFT tests.
 * Supports countdown and stopwatch modes with start/stop/reset controls.
 * Optionally surfaces standardized encouragement messages at given seconds,
 * paired with a short chime and selection haptic.
 */
export function TimerDisplay({
    mode,
    initialSeconds = 0,
    onComplete,
    onTick,
    encouragementCues,
    soundCues = false,
    endSound,
    disabled = false,
}: TimerDisplayProps) {
    const theme = useTheme();
    const [seconds, setSeconds] = useState(mode === 'countdown' ? initialSeconds : 0);
    const [isRunning, setIsRunning] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [activeCue, setActiveCue] = useState<EncouragementCue | null>(null);
    const [muted, setMutedState] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const firedCuesRef = useRef<Set<number>>(new Set());
    const cueFadeAnim = useRef(new Animated.Value(0)).current;
    const startTimestampRef = useRef<number>(0);
    const pausedElapsedRef = useRef<number>(0);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return clearTimer;
    }, [clearTimer]);

    useEffect(() => {
        if (soundCues) {
            preloadCue().catch(() => {});
        }
    }, [soundCues]);

    useEffect(() => {
        Animated.timing(cueFadeAnim, {
            toValue: activeCue ? 1 : 0,
            duration: activeCue ? 300 : 200,
            useNativeDriver: true,
        }).start();
    }, [activeCue, cueFadeAnim]);

    useEffect(() => {
        if (mode === 'stopwatch') {
            if (isRunning) {
                startTimestampRef.current = Date.now();
                intervalRef.current = setInterval(() => {
                    const elapsedMs = Date.now() - startTimestampRef.current + pausedElapsedRef.current;
                    const elapsedSecs = Math.round(elapsedMs / 100) / 10;
                    setSeconds(elapsedSecs);
                    onTick?.(elapsedSecs);
                }, 100);
            } else if (hasStarted && startTimestampRef.current > 0) {
                pausedElapsedRef.current += Date.now() - startTimestampRef.current;
                startTimestampRef.current = 0;
            }
            return clearTimer;
        }

        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            setSeconds((prev) => {
                const next = prev - 1;

                if (next <= 0) {
                    clearTimer();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    if (soundCues && endSound) {
                        playCue(endSound).catch(() => {});
                    }
                    setTimeout(() => {
                        setIsRunning(false);
                        onComplete?.(initialSeconds);
                    }, 0);
                    onTick?.(0);
                    return 0;
                }

                if (encouragementCues) {
                    const crossed = encouragementCues.find(
                        (cue) =>
                            prev > cue.atSecond &&
                            next <= cue.atSecond &&
                            !firedCuesRef.current.has(cue.atSecond),
                    );
                    if (crossed) {
                        firedCuesRef.current.add(crossed.atSecond);
                        setActiveCue(crossed);
                        if (soundCues) {
                            playCue(crossed.sound ?? 'bell').catch(() => {});
                        }
                    }
                }

                onTick?.(next);
                return next;
            });
        }, 1000);

        return clearTimer;
    }, [isRunning, mode, initialSeconds, onComplete, onTick, clearTimer, encouragementCues, soundCues, endSound, hasStarted]);

    const toggleTimer = () => {
        if (disabled) return;
        if (!hasStarted) setHasStarted(true);
        setIsRunning((prev) => !prev);
    };

    const resetTimer = () => {
        if (disabled) return;
        clearTimer();
        setIsRunning(false);
        setHasStarted(false);
        setSeconds(mode === 'countdown' ? initialSeconds : 0);
        setActiveCue(null);
        firedCuesRef.current = new Set();
        pausedElapsedRef.current = 0;
        startTimestampRef.current = 0;
    };

    const stopAndReport = () => {
        if (disabled) return;
        clearTimer();
        setIsRunning(false);
        startTimestampRef.current = 0;
        const elapsed = mode === 'countdown' ? initialSeconds - seconds : seconds;
        onComplete?.(mode === 'stopwatch' ? seconds : elapsed);
    };

    const toggleMute = () => {
        setMutedState((prev) => {
            const next = !prev;
            setMuted(next);
            return next;
        });
    };

    const formatTime = (totalSeconds: number): string => {
        const mins = Math.floor(Math.abs(totalSeconds) / 60);
        const secs = Math.floor(Math.abs(totalSeconds) % 60);
        const dec = Math.round((Math.abs(totalSeconds) % 1) * 10);
        if (mode === 'stopwatch') {
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${dec}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (mode === 'none') return null;

    return (
        <View style={styles.container} accessibilityRole="timer" accessibilityState={{ disabled }}>
            {activeCue?.message && (
                <Animated.View
                    style={[
                        styles.cueCard,
                        {
                            backgroundColor: theme.colors.tertiaryContainer,
                            opacity: cueFadeAnim,
                        },
                    ]}
                    accessibilityLiveRegion="polite"
                >
                    <Text style={[styles.cueText, { color: theme.colors.onTertiaryContainer }]}>
                        {activeCue.message}
                    </Text>
                </Animated.View>
            )}

            <Text style={[styles.timer, { color: disabled ? theme.colors.outline : theme.colors.primary }]}>
                {formatTime(seconds)}
            </Text>

            <View style={styles.controls}>
                {soundCues && (
                    <IconButton
                        icon={muted ? 'volume-off' : 'volume-high'}
                        mode="outlined"
                        size={28}
                        onPress={toggleMute}
                        accessibilityLabel={muted ? 'Activar sonido de avisos' : 'Silenciar avisos'}
                        disabled={disabled}
                    />
                )}
                <IconButton
                    icon="restart"
                    mode="outlined"
                    size={28}
                    onPress={resetTimer}
                    accessibilityLabel="Reiniciar cronómetro"
                    disabled={disabled || !hasStarted}
                />
                <IconButton
                    icon={isRunning ? 'pause' : 'play'}
                    mode="contained"
                    size={36}
                    containerColor={theme.colors.primary}
                    iconColor={theme.colors.onPrimary}
                    onPress={toggleTimer}
                    accessibilityLabel={isRunning ? 'Pausar' : 'Iniciar'}
                    style={styles.playButton}
                    disabled={disabled}
                />
                <IconButton
                    icon="stop"
                    mode="outlined"
                    size={28}
                    onPress={stopAndReport}
                    accessibilityLabel="Detener y guardar"
                    disabled={disabled || !hasStarted}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    cueCard: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        maxWidth: '90%',
    },
    cueText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 16,
        textAlign: 'center',
    },
    timer: {
        fontFamily: 'Montserrat_800ExtraBold',
        fontSize: 64,
        lineHeight: 72,
        letterSpacing: -1,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 16,
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
});

