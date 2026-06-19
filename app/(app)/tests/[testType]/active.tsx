import { LapDistanceCalculator } from '@/src/components/tests/LapDistanceCalculator';
import { RepCounter } from '@/src/components/tests/RepCounter';
import { TimerDisplay } from '@/src/components/tests/TimerDisplay';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { getSFTTest, SFT_TESTS } from '@/src/constants/sftTests';
import { useBatteryStore } from '@/src/stores/batteryStore';
import type { SFTTestType } from '@/src/types/battery.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';

function renderRichText(text: string, color = '#4b5563'): ReactNode {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
        <Text key={i} style={i % 2 === 1
            ? { fontFamily: 'Montserrat_700Bold', color }
            : { fontFamily: 'Montserrat_400Regular', color }
        }>{part}</Text>
    );
}

/**
 * Active test screen inside the dedicated SFT battery mode.
 */
export default function ActiveTestScreen() {
    const { testType } = useLocalSearchParams<{ testType: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();
    const { activeBatteryId, completedTests, patientId, resetBattery, saveResult } = useBatteryStore();

    const test = getSFTTest(testType ?? '');
    const [value, setValue] = useState(0);
    const [testNotes, setTestNotes] = useState('');
    const [timerCompleted, setTimerCompleted] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [safetyExpanded, setSafetyExpanded] = useState(false);
    const [procedureExpanded, setProcedureExpanded] = useState(false);
    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);

    const currentIndex = SFT_TESTS.findIndex((t) => t.type === testType);
    const totalTests = SFT_TESTS.length;
    const currentIsAlreadyComplete = completedTests.includes(testType as SFTTestType);
    const progress = currentIndex >= 0 ? (completedTests.length + (currentIsAlreadyComplete ? 0 : 1)) / totalTests : 0;
    const hasActiveSession = Boolean(activeBatteryId);

    useEffect(() => {
        setTestNotes('');
        setSafetyExpanded(false);
        setProcedureExpanded(false);
    }, [testType]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event) => {
            if (!hasActiveSession || allowExitRef.current) {
                return;
            }

            event.preventDefault();
            pendingNavigationActionRef.current = event.data.action;
            setExitDialogVisible(true);
        });

        return unsubscribe;
    }, [hasActiveSession, navigation, resetBattery]);

    const handleRequestExit = () => {
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(true);
    };

    const handleCancelExit = () => {
        pendingNavigationActionRef.current = null;
        setExitDialogVisible(false);
    };

    const handleConfirmExit = () => {
        allowExitRef.current = true;
        resetBattery();
        setExitDialogVisible(false);

        if (pendingNavigationActionRef.current) {
            navigation.dispatch(pendingNavigationActionRef.current as never);
            pendingNavigationActionRef.current = null;
            return;
        }

        const destination = patientId ? `/(app)/patients/${patientId}` : '/(app)/patients';
        router.replace(destination as never);
    };

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
        if (!test || !patientId) return;
        saveResult(test.type as SFTTestType, value, testNotes || undefined);
        const unitLabel = test.unit === 'meters' ? 'm' : test.unit;
        setSnackbar({ visible: true, message: `${test.shortName}: ${value} ${unitLabel} guardado` });
        allowExitRef.current = true;
        const completedAfterSave = new Set([...completedTests, test.type]);
        const nextTest =
            SFT_TESTS.slice(currentIndex + 1).find((candidate) => !completedAfterSave.has(candidate.type)) ??
            SFT_TESTS.find((candidate) => !completedAfterSave.has(candidate.type));

        setTimeout(() => {
            if (nextTest) {
                router.replace(`/(app)/tests/${nextTest.type}/active` as never);
                return;
            }

            router.replace(`/(app)/patients/${patientId}/batteries/summary` as never);
        }, 700);
    };

    const handleGoToBatteryOverview = () => {
        if (!patientId) return;
        allowExitRef.current = true;
        router.replace(`/(app)/patients/${patientId}/batteries/new` as never);
    };

    if (!test) {
        return (
            <View style={styles.container}>
                <Text>Prueba no encontrada</Text>
            </View>
        );
    }

    const canSave = test.timerMode === 'none' || timerCompleted || (test.counterMode === 'manual_input' && !test.lapTracking);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Realizar bateria SFT',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconButton
                                icon="format-list-bulleted"
                                size={24}
                                onPress={handleGoToBatteryOverview}
                            />
                            <IconButton icon="close" size={24} onPress={handleRequestExit} />
                        </View>
                    ),
                }}
            />

            <ScrollView style={styles.content} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
                <Text style={styles.progressHeader}>
                    Prueba {currentIndex + 1} de {totalTests}
                </Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name={test.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={24}
                        color={theme.colors.primary}
                    />
                    <View style={styles.instructionText}>
                        <Text style={styles.testName}>{test.name}</Text>
                        <Text style={styles.testDescription}>{test.description}</Text>
                    </View>
                </View>

                {test.procedure && test.procedure.length > 0 && (
                    <Pressable
                        style={[styles.safetyCard, { borderColor: theme.colors.outlineVariant }]}
                        onPress={() => setProcedureExpanded((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel="Procedimiento"
                    >
                        <View style={styles.safetyHeader}>
                            <View style={styles.safetyTitleRow}>
                                <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#006d77" />
                                <Text style={styles.safetyTitle}>Procedimiento</Text>
                            </View>
                            <MaterialCommunityIcons
                                name={procedureExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color="#6b7280"
                            />
                        </View>
                        {!procedureExpanded && (
                            <Text style={styles.safetyPreview} numberOfLines={1}>
                                {test.procedure[0].replace(/\*\*/g, '')}
                            </Text>
                        )}
                        {procedureExpanded && (
                            <View style={styles.stepContainer}>
                                {test.procedure.map((step, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <View style={styles.stepColumn}>
                                            <View style={[styles.stepCircle, { backgroundColor: theme.colors.outlineVariant }]}>
                                                <Text style={[styles.stepNumber, { color: '#6b7280' }]}>{i + 1}</Text>
                                            </View>
                                            {i < test.procedure!.length - 1 && (
                                                <View style={[styles.stepLine, { backgroundColor: theme.colors.outlineVariant }]} />
                                            )}
                                        </View>
                                        <Text style={styles.stepText}>{renderRichText(step)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Pressable>
                )}

                {test.safetyTips && test.safetyTips.length > 0 && (
                    <Pressable
                        style={[styles.safetyCard, { borderColor: theme.colors.outlineVariant }]}
                        onPress={() => setSafetyExpanded((prev) => !prev)}
                        accessibilityRole="button"
                        accessibilityLabel="Normas de seguridad"
                    >
                        <View style={styles.safetyHeader}>
                            <View style={styles.safetyTitleRow}>
                                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#006d77" />
                                <Text style={styles.safetyTitle}>Normas de seguridad</Text>
                            </View>
                            <MaterialCommunityIcons
                                name={safetyExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color="#6b7280"
                            />
                        </View>
                        {!safetyExpanded && test.safetyTips.length > 0 && (
                            <Text style={styles.safetyPreview} numberOfLines={1}>
                                {test.safetyTips[0].replace(/\*\*/g, '')}
                            </Text>
                        )}
                        {safetyExpanded && (
                            <View style={styles.stepContainer}>
                                {test.safetyTips.map((tip, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <View style={styles.stepColumn}>
                                            <View style={[styles.stepCircle, { backgroundColor: theme.colors.outlineVariant }]}>
                                                <Text style={[styles.stepNumber, { color: '#6b7280' }]}>{i + 1}</Text>
                                            </View>
                                            {i < test.safetyTips.length - 1 && (
                                                <View style={[styles.stepLine, { backgroundColor: theme.colors.outlineVariant }]} />
                                            )}
                                        </View>
                                        <Text style={styles.stepText}>{renderRichText(tip)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Pressable>
                )}

                {test.timerMode !== 'none' && (
                    <TimerDisplay
                        mode={test.timerMode}
                        initialSeconds={test.timerSeconds}
                        onComplete={handleTimerComplete}
                        encouragementCues={test.encouragementCues}
                        soundCues={test.soundCues}
                        endSound={test.endSound}
                    />
                )}

                {test.counterMode === 'increment' && (
                    <RepCounter
                        mode="increment"
                        allowNegative={test.allowNegative}
                        onValueChange={handleValueChange}
                        label={test.inputLabel}
                    />
                )}

                {test.counterMode === 'manual_input' && test.lapTracking && (
                    <LapDistanceCalculator
                        lapLengthMeters={test.lapLengthMeters ?? 45.72}
                        onValueChange={handleValueChange}
                    />
                )}

                {test.counterMode === 'manual_input' && !test.lapTracking && (
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

                <TextInput
                    label="Observaciones (opcional)"
                    value={testNotes}
                    onChangeText={setTestNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.notesInput}
                    outlineStyle={styles.notesOutline}
                    accessibilityLabel="Observaciones de la prueba"
                />

            </ScrollView>

            <StickyBottomBar>
                <AppButton
                    label="Guardar resultado"
                    variant="filled"
                    icon="content-save"
                    onPress={handleSave}
                    disabled={!canSave}
                    accessibilityLabel="Guardar resultado de la prueba"
                />
            </StickyBottomBar>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type="success"
                onDismiss={() => setSnackbar({ visible: false, message: '' })}
            />
            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={handleCancelExit}>
                    <Dialog.Title>Salir de la bateria</Dialog.Title>
                    <Dialog.Content>
                        <Text>Si sales ahora se perderan los resultados no guardados. Deseas salir?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={handleCancelExit}>Continuar bateria</PaperButton>
                        <PaperButton onPress={handleConfirmExit}>Salir</PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    progressHeader: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151', marginBottom: 6 },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 16 },
    progressFill: { height: 6 },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 40 },
    instructionCard: { borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
    instructionText: { flex: 1 },
    testName: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#004d40' },
    testDescription: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#004d40', lineHeight: 18, marginTop: 2 },
    timerResultContainer: { alignItems: 'center', paddingVertical: 16 },
    timerResultLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    timerResultValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    notesInput: { marginTop: 20 },
    notesOutline: { borderRadius: 12 },
    safetyCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
    safetyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    safetyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    safetyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    safetyPreview: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 4 },
    safetyList: { marginTop: 8, gap: 6 },
    safetyTipRow: { flexDirection: 'row', gap: 8 },
    safetyBullet: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#4b5563', lineHeight: 18 },
    safetyTip: { flex: 1, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#4b5563', lineHeight: 18 },
    stepContainer: { marginTop: 10 },
    stepRow: { flexDirection: 'row', gap: 10 },
    stepColumn: { alignItems: 'center', width: 22 },
    stepCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    stepNumber: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: '#ffffff' },
    stepLine: { width: 1.5, flex: 1 },
    stepText: { flex: 1, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#4b5563', lineHeight: 18 },
});
