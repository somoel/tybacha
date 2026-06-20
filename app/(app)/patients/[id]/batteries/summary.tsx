import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { usePermissions } from '@/src/hooks/usePermissions';
import { createBattery, saveBatteryWithResults } from '@/src/services/batteryService';
import { generateExercisePlan } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Patient } from '@/src/types/patient.types';
import { calculateAgeBand, getNormativeRange, getPerformanceCategory } from '@/shared/constants/normativeRanges';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';

type FinalAction = 'patient' | 'plan';

export default function BatterySummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const isOnline = useSyncStore((s) => s.isOnline);
    const { activeBatteryId, clearSession, completedTests, notes: generalNotes, resultNotes, results, setNotes } = useBatteryStore();
    const [savingAction, setSavingAction] = useState<FinalAction | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [patient, setPatient] = useState<Patient | null>(null);
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<FinalAction | null>(null);
    const allowExitRef = useRef(false);

    const canCreatePlan = isAdmin || isProfessional;
    const hasAllResults = SFT_TESTS.every((test) => results[test.type] !== undefined);
    const isComplete = completedTests.length === SFT_TESTS.length && hasAllResults;

    useEffect(() => {
        if (id) {
            fetchPatientById(id).then(setPatient).catch(() => {});
        }
    }, [id]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event) => {
            if (allowExitRef.current || !activeBatteryId) return;
            event.preventDefault();
            setExitDialogVisible(true);
        });
        return unsubscribe;
    }, [navigation, activeBatteryId]);

    const handleBackToCorrect = (testType?: string) => {
        allowExitRef.current = true;
        router.replace(`/(app)/tests/${testType ?? SFT_TESTS[SFT_TESTS.length - 1].type}/active` as never);
    };

    const handleClose = () => {
        if (isComplete) {
            handleConfirmFinalize('patient');
        } else {
            allowExitRef.current = true;
            clearSession();
            router.replace(`/(app)/patients/${id}` as never);
        }
    };

    const handleConfirmFinalize = (action: FinalAction) => {
        setPendingAction(action);
        setConfirmDialogVisible(true);
    };

    const handleConfirmDialogYes = () => {
        setConfirmDialogVisible(false);
        if (pendingAction) {
            finalizeAndNavigate(pendingAction);
            setPendingAction(null);
        }
    };

    const finalizeAndNavigate = async (action: FinalAction) => {
        if (!user || !id || !activeBatteryId || !isComplete) {
            setSnackbar({ visible: true, message: 'Completa y guarda un valor para cada prueba antes de finalizar.', type: 'error' });
            return;
        }

        setSavingAction(action);
        let batteryPersisted = false;
        try {
            const battery = await createBattery(id, user.id, generalNotes || undefined, isOnline);
            const savedBattery = await saveBatteryWithResults(battery.id, results, resultNotes, isOnline);
            batteryPersisted = true;

            if (action === 'plan') {
                await generateExercisePlan({ id } as any, [], '', savedBattery.batteryId);
            }

            clearSession();
            allowExitRef.current = true;
            const destination = action === 'plan'
                ? `/(app)/patients/${id}/progress/edit-plan?from=battery`
                : `/(app)/patients/${id}`;
            router.replace(destination as never);
        } catch (error) {
            if (batteryPersisted) {
                clearSession();
                allowExitRef.current = true;
                const message = error instanceof Error
                    ? `Batería guardada. La generación del plan falló: ${error.message}. Reintenta desde el detalle.`
                    : 'Batería guardada. La generación del plan falló. Reintenta desde el detalle.';
                console.error('Error generando plan tras persistir batería:', error);
                setSnackbar({ visible: true, message, type: 'error' });
                setTimeout(() => {
                    router.replace(`/(app)/patients/${id}` as never);
                }, 2000);
            } else {
                const message = error instanceof Error ? error.message : 'Error al guardar la batería.';
                setSnackbar({ visible: true, message, type: 'error' });
                setSavingAction(null);
            }
        }
    };

    const ageBand = patient ? calculateAgeBand(patient.birth_date) : null;
    const gender = patient?.gender === 'male' ? 'M' as const : patient?.gender === 'female' ? 'F' as const : null;

    const getCategoryForTest = (testType: string, value: number) => {
        if (!ageBand || !gender) return null;
        const range = getNormativeRange(testType as any, gender, ageBand);
        if (!range) return null;
        const test = SFT_TESTS.find((t) => t.type === testType);
        const higherIsBetter = test?.normativeRanges?.higherIsBetter ?? true;
        return getPerformanceCategory(value, range, higherIsBetter);
    };

    const categoryColors: Record<string, string> = {
        'Bajo promedio': '#ef4444',
        'Promedio': '#6b7280',
        'Por encima del promedio': '#2e7d32',
        'Excelente': '#1565c0',
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Resumen batería SFT',
                    animation: 'fade',
                    headerRight: () => (
                        <IconButton
                            icon="close"
                            size={24}
                            onPress={handleClose}
                            disabled={savingAction !== null}
                        />
                    ),
                }}
            />

            <ScrollView style={styles.content} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
                <Text style={styles.progressHeader}>{completedTests.length} de {SFT_TESTS.length} pruebas completadas</Text>
                <View
                    style={styles.progressTrack}
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: SFT_TESTS.length, now: completedTests.length, text: `${completedTests.length} de ${SFT_TESTS.length} pruebas completadas` }}
                >
                    <View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
                </View>
                <Text style={styles.correctHint}>Toca un resultado para corregirlo</Text>
                {SFT_TESTS.map((test) => {
                    const value = results[test.type];
                    const missing = value === undefined;
                    const category = !missing ? getCategoryForTest(test.type, value) : null;

                    return (
                        <AppCard
                            key={test.type}
                            style={styles.resultCard}
                            onPress={!missing ? () => handleBackToCorrect(test.type) : undefined}
                        >
                            <View style={styles.resultRow}>
                                <View style={[styles.iconContainer, { backgroundColor: missing ? '#eef2f7' : '#e8f5e9' }]}>
                                    <MaterialCommunityIcons
                                        name={missing ? 'alert-circle-outline' : 'check-circle'}
                                        size={24}
                                        color={missing ? '#64748b' : '#2e7d32'}
                                    />
                                </View>
                                <View style={styles.resultInfo}>
                                    <Text style={styles.testName}>{test.name}</Text>
                                    <Text style={styles.testShort}>{test.shortName}</Text>
                                    {category && (
                                        <Text style={[styles.categoryLabel, { color: categoryColors[category] ?? '#6b7280' }]}>
                                            {category}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.valueContainer}>
                                    <Text style={[styles.value, { color: missing ? theme.colors.outline : theme.colors.primary }]}>
                                        {missing ? '-' : value}
                                    </Text>
                                    <Text style={styles.unit}>{missing ? '' : test.unit}</Text>
                                </View>
                            </View>
                        </AppCard>
                    );
                })}

                <TextInput
                    label="Observaciones generales (opcional)"
                    value={generalNotes}
                    onChangeText={setNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.notesInput}
                    outlineStyle={styles.notesOutline}
                    accessibilityLabel="Observaciones generales de la batería"
                />
            </ScrollView>

            <StickyBottomBar>
                <AppButton
                    label={canCreatePlan ? 'Crear plan de ejercicios' : 'Volver al adulto mayor'}
                    icon={canCreatePlan ? 'robot' : 'account-arrow-left'}
                    variant="filled"
                    onPress={() => handleConfirmFinalize(canCreatePlan ? 'plan' : 'patient')}
                    loading={savingAction !== null}
                    disabled={!isComplete}
                    accessibilityLabel={canCreatePlan ? 'Crear plan de ejercicios' : 'Volver al adulto mayor'}
                />
            </StickyBottomBar>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />

            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={() => setExitDialogVisible(false)}>
                    <Dialog.Title>Salir del resumen</Dialog.Title>
                    <Dialog.Content>
                        <Text>Si sales ahora, la batería no se guardará. ¿Desea salir?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={() => setExitDialogVisible(false)}>Quedarse</PaperButton>
                        <PaperButton onPress={() => { allowExitRef.current = true; setExitDialogVisible(false); clearSession(); router.replace(`/(app)/patients/${id}` as never); }}>Salir</PaperButton>
                    </Dialog.Actions>
                </Dialog>

                <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
                    <Dialog.Title>Guardar batería</Dialog.Title>
                    <Dialog.Content>
                        <Text>Se guardarán los {SFT_TESTS.length} resultados de la batería SFT. ¿Continuar?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <PaperButton onPress={() => setConfirmDialogVisible(false)}>Cancelar</PaperButton>
                        <PaperButton onPress={handleConfirmDialogYes}>Guardar</PaperButton>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    progressHeader: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151', marginBottom: 6 },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: 6, width: '100%' },
    correctHint: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#94a3b8', marginBottom: 12 },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 32 },
    resultCard: { marginBottom: 8 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    resultInfo: { flex: 1 },
    testName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    testShort: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    categoryLabel: { fontFamily: 'Montserrat_500Medium', fontSize: 11, marginTop: 2 },
    valueContainer: { alignItems: 'flex-end', minWidth: 72 },
    value: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },
    unit: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    notesInput: { marginTop: 16 },
    notesOutline: { borderRadius: 12 },
});
