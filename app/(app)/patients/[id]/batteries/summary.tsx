import { ApiError, isNetworkError } from '@/src/api/httpClient';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppDialogActions } from '@/src/components/ui/AppDialogActions';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { usePermissions } from '@/src/hooks/usePermissions';
import { enqueueOfflineOperation } from '@/src/lib/offlineQueue';
import { buildSftApplicationPayload, submitSftApplication } from '@/src/services/batteryService';
import { generateExercisePlan } from '@/src/services/exercisePlanService';
import { fetchPatientById } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import type { Patient } from '@/src/types/patient.types';
import { calculateAgeBand, getNormativeRange, getPerformanceCategory } from '@/shared/constants/normativeRanges';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';

type FinalAction = 'patient' | 'plan';

export default function BatterySummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const isOnline = useSyncStore((s) => s.isOnline);
    const {
        activeBatteryId,
        clearSession,
        completedTests,
        estaturaCm,
        imc,
        notes: generalNotes,
        pesoKg,
        resultNotes,
        results,
        setNotes,
    } = useBatteryStore();
    const [savingAction, setSavingAction] = useState<FinalAction | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [patient, setPatient] = useState<Patient | null>(null);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<FinalAction | null>(null);

    const canCreatePlan = isAdmin || isProfessional;
    const hasAllResults = SFT_TESTS.every((test) => results[test.type] !== undefined);
    const isComplete = completedTests.length === SFT_TESTS.length && hasAllResults;

    useEffect(() => {
        if (id) {
            fetchPatientById(id).then(setPatient).catch(() => {});
        }
    }, [id]);

    const handleBackToCorrect = (testType?: string) => {
        router.replace(`/(app)/tests/${testType ?? SFT_TESTS[SFT_TESTS.length - 1].type}/active` as never);
    };

    /** Back: siempre al overview de la batería (/new), sin alertas. */
    const handleBackPress = () => {
        const state = navigation.getState();
        const previous = state && state.index > 0 ? state.routes[state.index - 1] : null;
        if (previous?.name.endsWith('batteries/new')) {
            navigation.goBack();
            return;
        }
        router.replace(`/(app)/patients/${id}/batteries/new` as never);
    };

    /**
     * Cierra el flujo de batería: descarta `batteries/new` y este resumen del stack de
     * `patients/[id]` con dismissTo (no replace), de modo que el usuario nunca vuelva a
     * "Registrar IMC" al usar el botón atrás. Opcionalmente apila una pantalla encima.
     */
    const leaveBatteryFlow = (next?: string) => {
        router.dismissTo(`/(app)/patients/${id}` as never);
        if (next) {
            router.push(next as never);
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

    /** Encola el payload en almacenamiento local. Devuelve false si el storage falló. */
    const queueBattery = async (
        payload: ReturnType<typeof buildSftApplicationPayload>,
        idLocal: string,
    ): Promise<boolean> => {
        try {
            await enqueueOfflineOperation('aplicacion_sft', 'crear', { ...payload }, idLocal);
            return true;
        } catch (error) {
            console.error('Error al encolar la batería en el dispositivo:', error);
            setSnackbar({ visible: true, message: 'No se pudo guardar la batería en este dispositivo. Reintenta.', type: 'error' });
            setSavingAction(null);
            return false;
        }
    };

    const finalizeAndNavigate = async (action: FinalAction) => {
        if (!user || !id || !activeBatteryId || !isComplete) {
            setSnackbar({ visible: true, message: 'Completa y guarda un valor para cada prueba antes de finalizar.', type: 'error' });
            return;
        }

        setSavingAction(action);

        const payload = buildSftApplicationPayload({
            patientId: id,
            results,
            resultNotes,
            notes: generalNotes || undefined,
            pesoKg,
            estaturaCm,
            imc,
        });

        let queued = false;
        let savedBatteryId: string | null = null;

        if (!isOnline) {
            // Sin conexión: va directo a la cola, sin intentar la red.
            queued = await queueBattery(payload, activeBatteryId);
            if (!queued) return;
        } else {
            try {
                // activeBatteryId actúa como clave de idempotencia: si el POST
                // se aplicó pero se perdió la respuesta, el reintento (por
                // encolado o por la cola offline) no duplica la batería.
                const saved = await submitSftApplication(payload, activeBatteryId);
                savedBatteryId = saved.batteryId;
            } catch (error) {
                const isTransient =
                    isNetworkError(error) || (error instanceof ApiError && error.status >= 500);

                if (!isTransient) {
                    // 4xx = validación/permiso: no se encola y la sesión queda intacta.
                    const message = error instanceof Error ? error.message : 'Error al guardar la batería.';
                    setSnackbar({ visible: true, message, type: 'error' });
                    setSavingAction(null);
                    return;
                }

                queued = await queueBattery(payload, activeBatteryId);
                if (!queued) return;
            }
        }

        // Éxito: la batería quedó persistida (online o en la cola offline).
        if (queued) {
            const message = action === 'plan'
                ? 'Batería guardada en este dispositivo. Sin conexión: el plan de ejercicios podrás generarlo después desde el detalle del adulto mayor.'
                : 'Batería guardada en este dispositivo. Se sincronizará automáticamente al recuperar la conexión.';
            setSnackbar({ visible: true, message, type: 'success' });
            clearSession();
            setTimeout(() => {
                leaveBatteryFlow();
            }, 2000);
            return;
        }

        if (action === 'plan') {
            try {
                await generateExercisePlan({ id } as any, [], '', savedBatteryId ?? '');
            } catch (error) {
                clearSession();
                const message = error instanceof Error
                    ? `Batería guardada. La generación del plan falló: ${error.message}. Reintenta desde el detalle.`
                    : 'Batería guardada. La generación del plan falló. Reintenta desde el detalle.';
                console.error('Error generando plan tras persistir batería:', error);
                setSnackbar({ visible: true, message, type: 'error' });
                setTimeout(() => {
                    leaveBatteryFlow();
                }, 2000);
                return;
            }
        }

        clearSession();
        leaveBatteryFlow(
            action === 'plan' ? `/(app)/patients/${id}/progress/edit-plan?from=battery` : undefined,
        );
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
                    headerLeft: () => (
                        <Pressable onPress={handleBackPress} hitSlop={8} style={{ paddingHorizontal: 12 }}>
                            <MaterialCommunityIcons name="arrow-left" size={26} color={theme.colors.primary} />
                        </Pressable>
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
                <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
                    <Dialog.Title>Guardar batería</Dialog.Title>
                    <Dialog.Content>
                        <Text>Se guardarán los {SFT_TESTS.length} resultados de la batería SFT. ¿Continuar?</Text>
                    </Dialog.Content>
                    <AppDialogActions>
                        <PaperButton onPress={() => setConfirmDialogVisible(false)}>Cancelar</PaperButton>
                        <PaperButton onPress={handleConfirmDialogYes}>Guardar</PaperButton>
                    </AppDialogActions>
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
