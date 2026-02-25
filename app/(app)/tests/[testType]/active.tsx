import { RepCounter } from '@/src/components/tests/RepCounter';
import { TimerDisplay } from '@/src/components/tests/TimerDisplay';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { getSFTTest, SFT_TESTS } from '@/src/constants/sftTests';
import { useBatteryStore } from '@/src/stores/batteryStore';
import type { SFTTestType } from '@/src/types/battery.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * RF-08: Active test screen with timer/counter for specific SFT test.
 */
export default function ActiveTestScreen() {
    const { testType } = useLocalSearchParams<{ testType: string }>();
    const router = useRouter();
    const theme = useTheme();
    const { saveResult, completedTests } = useBatteryStore();

    const test = getSFTTest(testType ?? '');
    const [value, setValue] = useState(0);
    const [timerCompleted, setTimerCompleted] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

    const currentIndex = SFT_TESTS.findIndex((t) => t.type === testType);
    const totalTests = SFT_TESTS.length;

    const handleTimerComplete = useCallback((elapsed: number) => {
        setTimerCompleted(true);
        if (test?.counterMode === 'timer_result') {
            setValue(parseFloat(elapsed.toFixed(1)));
        }
    }, [test]);

    const handleValueChange = useCallback((newValue: number) => {
        setValue(newValue);
    }, []);

    const handleSave = () => {
        if (!test) return;
        saveResult(test.type as SFTTestType, value);
        setSnackbar({ visible: true, message: `${test.shortName}: ${value} ${test.unit} guardado ✓` });
        setTimeout(() => router.back(), 1000);
    };

    if (!test) {
        return (
            <View style={styles.container}>
                <Text>Prueba no encontrada</Text>
            </View>
        );
    }

    const canSave = test.timerMode === 'none' || timerCompleted || test.counterMode === 'manual_input';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
            {/* Progress indicator */}
            <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                    Prueba {currentIndex + 1} de {totalTests}
                </Text>
            </View>

            {/* Test instructions */}
            <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons
                    name={test.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={36}
                    color={theme.colors.primary}
                />
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testDescription}>{test.description}</Text>
            </View>

            {/* Timer */}
            {test.timerMode !== 'none' && (
                <TimerDisplay
                    mode={test.timerMode}
                    initialSeconds={test.timerSeconds}
                    onComplete={handleTimerComplete}
                />
            )}

            {/* Counter/Input */}
            {test.counterMode === 'increment' && (
                <RepCounter
                    mode="increment"
                    allowNegative={test.allowNegative}
                    onValueChange={handleValueChange}
                    label={test.inputLabel}
                />
            )}

            {test.counterMode === 'manual_input' && (
                <RepCounter
                    mode="manual_input"
                    allowNegative={test.allowNegative}
                    onValueChange={handleValueChange}
                    label={test.inputLabel}
                />
            )}

            {test.counterMode === 'timer_result' && timerCompleted && (
                <View style={styles.timerResultContainer}>
                    <Text style={styles.timerResultLabel}>Tiempo registrado:</Text>
                    <Text style={[styles.timerResultValue, { color: theme.colors.primary }]}>
                        {value.toFixed(1)} segundos
                    </Text>
                </View>
            )}

            {/* Save button */}
            <AppButton
                label="Guardar resultado"
                variant="filled"
                icon="content-save"
                onPress={handleSave}
                disabled={!canSave}
                style={styles.saveBtn}
                accessibilityLabel="Guardar resultado de la prueba"
            />

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type="success"
                onDismiss={() => setSnackbar({ visible: false, message: '' })}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 16, paddingBottom: 40 },
    progressRow: { alignItems: 'center', marginBottom: 12 },
    progressText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#6b7280' },
    instructionCard: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, marginBottom: 20 },
    testName: { fontFamily: 'Montserrat_700Bold', fontSize: 20, color: '#004d40', textAlign: 'center' },
    testDescription: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#004d40', textAlign: 'center', lineHeight: 20 },
    timerResultContainer: { alignItems: 'center', paddingVertical: 16 },
    timerResultLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    timerResultValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    saveBtn: { marginTop: 24 },
});
