import type { TimerMode } from '@/src/types/battery.types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

interface TimerDisplayProps {
    mode: TimerMode;
    initialSeconds?: number;
    onComplete?: (elapsedSeconds: number) => void;
    onTick?: (seconds: number) => void;
}

/**
 * Large timer display for SFT tests.
 * Supports countdown and stopwatch modes with start/stop/reset controls.
 */
export function TimerDisplay({
    mode,
    initialSeconds = 0,
    onComplete,
    onTick,
}: TimerDisplayProps) {
    const theme = useTheme();
    const [seconds, setSeconds] = useState(mode === 'countdown' ? initialSeconds : 0);
    const [isRunning, setIsRunning] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            setSeconds((prev) => {
                const next = mode === 'countdown' ? prev - 1 : prev + 1;

                if (mode === 'countdown' && next <= 0) {
                    clearTimer();
                    setIsRunning(false);
                    onComplete?.(initialSeconds);
                    onTick?.(0);
                    return 0;
                }

                onTick?.(next);
                return next;
            });
        }, 1000);

        return clearTimer;
    }, [isRunning, mode, initialSeconds, onComplete, onTick, clearTimer]);

    const toggleTimer = () => {
        if (!hasStarted) setHasStarted(true);
        setIsRunning((prev) => !prev);
    };

    const resetTimer = () => {
        clearTimer();
        setIsRunning(false);
        setHasStarted(false);
        setSeconds(mode === 'countdown' ? initialSeconds : 0);
    };

    const stopAndReport = () => {
        clearTimer();
        setIsRunning(false);
        const elapsed = mode === 'countdown' ? initialSeconds - seconds : seconds;
        onComplete?.(mode === 'stopwatch' ? seconds : elapsed);
    };

    const formatTime = (totalSeconds: number): string => {
        const mins = Math.floor(Math.abs(totalSeconds) / 60);
        const secs = Math.abs(totalSeconds) % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (mode === 'none') return null;

    return (
        <View style={styles.container} accessibilityRole="timer">
            <Text style={[styles.timer, { color: theme.colors.primary }]}>
                {formatTime(seconds)}
            </Text>

            <View style={styles.controls}>
                <IconButton
                    icon="restart"
                    mode="outlined"
                    size={28}
                    onPress={resetTimer}
                    accessibilityLabel="Reiniciar cronómetro"
                    disabled={!hasStarted}
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
                />
                <IconButton
                    icon="stop"
                    mode="outlined"
                    size={28}
                    onPress={stopAndReport}
                    accessibilityLabel="Detener y guardar"
                    disabled={!hasStarted}
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
