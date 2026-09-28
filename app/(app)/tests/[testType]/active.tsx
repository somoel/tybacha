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

const DISTANCE_MIN = -100;
const DISTANCE_MAX = 100;

interface ExpandableInfoCardProps {
    title: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    items: string[];
    expanded: boolean;
    onToggle: () => void;
    accessibilityLabel: string;
}

/**
 * Tarjeta colapsable de procedimiento o normas de seguridad.
 * Va memoizada para que pulsar el contador no vuelva a renderizar su contenido.
 */
const ExpandableInfoCard = React.memo(function ExpandableInfoCard({
    title,
    icon,
    items,
    expanded,
    onToggle,
    accessibilityLabel,
}: ExpandableInfoCardProps) {
    const theme = useTheme();
    if (items.length === 0) return null;

    return (
        <Pressable
            style={[styles.safetyCard, { borderColor: theme.colors.outlineVariant }]}
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded }}
        >
            <View style={styles.safetyHeader}>
                <View style={styles.safetyTitleRow}>
                    <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
                    <Text style={styles.safetyTitle}>{title}</Text>
                </View>
                <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6b7280"
                />
            </View>
            {!expanded && (
                <Text style={styles.safetyPreview} numberOfLines={1}>
                    {items[0].replace(/\*\*/g, '')}
                </Text>
            )}
            {expanded && (
                <View style={styles.stepContainer}>
                    {items.map((item, i) => (
                        <View key={i} style={styles.stepRow}>
                            <View style={styles.stepColumn}>
                                <View style={[styles.stepCircle, { backgroundColor: theme.colors.outlineVariant }]}>
                                    <Text style={[styles.stepNumber, { color: '#6b7280' }]}>{i + 1}</Text>
                                </View>
                                {i < items.length - 1 && (
                                    <View style={[styles.stepLine, { backgroundColor: theme.colors.outlineVariant }]} />
                                )}
                            </View>
                            <Text style={styles.stepText}>{renderRichText(item)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </Pressable>
    );
});

/**
 * Active test screen inside the dedicated SFT battery mode.
 */
export default function ActiveTestScreen() {
    const { testType } = useLocalSearchParams<{ testType: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();
    const { activeBatteryId, completedTests, patientId, saveResult } = useBatteryStore();

    const test = getSFTTest(testType ?? '');
    const [value, setValue] = useState(0);
    const [testNotes, setTestNotes] = useState('');
    const [timerCompleted, setTimerCompleted] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [safetyExpanded, setSafetyExpanded] = useState(false);
    const [procedureExpanded, setProcedureExpanded] = useState(false);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);

    const currentIndex = SFT_TESTS.findIndex((t) => t.type === testType);
    const totalTests = SFT_TESTS.length;
    const currentIsAlreadyComplete = completedTests.includes(testType as SFTTestType);
    const progress = currentIndex >= 0 ? (completedTests.length + (currentIsAlreadyComplete ? 0 : 1)) / totalTests : 0;
    const hasActiveSession = Boolean(activeBatteryId);

    useEffect(() => {
        setValue(0);
        setTestNotes('');
        setSafetyExpanded(false);
        setProcedureExpanded(false);
        setNotesExpanded(false);
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
    }, [hasActiveSession, navigation]);

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

    const toggleProcedure = useCallback(() => setProcedureExpanded((prev) => !prev), []);
    const toggleSafety = useCallback(() => setSafetyExpanded((prev) => !prev), []);
    const toggleNotes = useCallback(() => setNotesExpanded((prev) => !prev), []);

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
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyTitle}>Prueba no encontrada</Text>
                <Text style={styles.emptyText}>El tipo de prueba no es válido.</Text>
            </View>
        );
    }

    const canSave = test.timerMode === 'none' || timerCompleted || (test.counterMode === 'manual_input' && !test.lapTracking);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Realizar batería SFT',
                    animation: 'slide_from_right',
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
                <View
                    style={styles.progressTrack}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: totalTests, now: completedTests.length + (currentIsAlreadyComplete ? 0 : 1) }}
                >
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <View style={[styles.instructionCard, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                        name={test.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={24}
                        color={theme.colors.primary}
                    />
                    <View style={styles.instructionText}>
                        <Text style={[styles.testName, { color: theme.colors.onPrimaryContainer }]}>{test.name}</Text>
                        <Text style={[styles.testDescription, { color: theme.colors.onPrimaryContainer }]}>{test.description}</Text>
                    </View>
                </View>

                {test.procedure && test.procedure.length > 0 && (
                    <ExpandableInfoCard
                        title="Procedimiento"
                        icon="clipboard-text-outline"
                        items={test.procedure}
                        expanded={procedureExpanded}
                        onToggle={toggleProcedure}
                        accessibilityLabel="Procedimiento"
                    />
                )}

                {test.safetyTips && test.safetyTips.length > 0 && (
                    <ExpandableInfoCard
                        title="Normas de seguridad"
                        icon="shield-check-outline"
                        items={test.safetyTips}
                        expanded={safetyExpanded}
                        onToggle={toggleSafety}
                        accessibilityLabel="Normas de seguridad"
                    />
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
                        value={value}
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
                        value={value}
                        allowNegative={test.allowNegative}
                        onValueChange={handleValueChange}
                        label={test.inputLabel}
                        unit={test.unit}
                        min={test.unit === 'cm' ? DISTANCE_MIN : undefined}
                        max={test.unit === 'cm' ? DISTANCE_MAX : undefined}
                    />
                )}

                {test.type === 'up_and_go' && test.normativeRanges && (
                    <View style={styles.normativeHint}>
                        <MaterialCommunityIcons name="target" size={16} color={theme.colors.outline} />
                        <Text style={[styles.normativeHintText, { color: theme.colors.outline }]}>
                            Promedio: {test.normativeRanges.aboveAvg}–{test.normativeRanges.belowAvg} s
                        </Text>
                    </View>
                )}

                {test.counterMode === 'timer_result' && timerCompleted && (
                    <View style={styles.timerResultContainer}>
                        <Text style={styles.timerResultLabel}>Tiempo registrado:</Text>
                        <Text style={[styles.timerResultValue, { color: theme.colors.primary }]}>
                            {value.toFixed(1)} segundos
                        </Text>
                    </View>
                )}

                <Pressable
                    onPress={toggleNotes}
                    style={styles.notesToggle}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: notesExpanded }}
                    accessibilityLabel={notesExpanded ? 'Ocultar observaciones' : 'Agregar observaciones'}
                >
                    <MaterialCommunityIcons name="note-text-outline" size={18} color={theme.colors.outline} />
                    <Text style={[styles.notesToggleText, { color: theme.colors.outline }]}>
                        {testNotes ? `Observaciones: ${testNotes.substring(0, 40)}${testNotes.length > 40 ? '…' : ''}` : (notesExpanded ? 'Ocultar observaciones' : 'Agregar observaciones')}
                    </Text>
                    <MaterialCommunityIcons
                        name={notesExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={theme.colors.outline}
                    />
                </Pressable>
                {notesExpanded && (
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
                )}

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
                {!canSave && test.timerMode !== 'none' && (
                    <Text style={styles.saveHint}>Inicia el cronómetro para poder guardar</Text>
                )}
            </StickyBottomBar>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type="success"
                onDismiss={() => setSnackbar({ visible: false, message: '' })}
            />
            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={handleCancelExit}>
                    <Dialog.Title>Salir de la batería</Dialog.Title>
                    <Dialog.Content>
                        <Text>Tu progreso queda guardado en este dispositivo y podrás retomar esta batería después.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={handleCancelExit}>Continuar batería</PaperButton>
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
    testName: { fontFamily: 'Montserrat_700Bold', fontSize: 16 },
    testDescription: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 18, marginTop: 2 },
    timerResultContainer: { alignItems: 'center', paddingVertical: 16 },
    timerResultLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    timerResultValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    notesInput: { marginTop: 8 },
    notesOutline: { borderRadius: 12 },
    notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginTop: 16 },
    notesToggleText: { fontFamily: 'Montserrat_500Medium', fontSize: 13, flex: 1 },
    saveHint: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
    normativeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginTop: 8 },
    normativeHintText: { fontFamily: 'Montserrat_500Medium', fontSize: 13 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f8fafc' },
    emptyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 18, color: '#374151', marginTop: 16 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', marginTop: 4, textAlign: 'center' },
    safetyCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
    safetyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    safetyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    safetyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151' },
    safetyPreview: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 4 },
    stepContainer: { marginTop: 10 },
    stepRow: { flexDirection: 'row', gap: 10 },
    stepColumn: { alignItems: 'center', width: 22 },
    stepCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    stepNumber: { fontFamily: 'Montserrat_700Bold', fontSize: 11, color: '#ffffff' },
    stepLine: { width: 1.5, flex: 1 },
    stepText: { flex: 1, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#4b5563', lineHeight: 18 },
});
