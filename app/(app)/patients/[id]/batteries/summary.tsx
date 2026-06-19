import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { usePermissions } from '@/src/hooks/usePermissions';
import { createBattery, saveBatteryWithResults } from '@/src/services/batteryService';
import { generateExercisePlan } from '@/src/services/exercisePlanService';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, TextInput, useTheme } from 'react-native-paper';

type FinalAction = 'patient' | 'plan';

export default function BatterySummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const isOnline = useSyncStore((s) => s.isOnline);
    const { activeBatteryId, clearSession, completedTests, notes: generalNotes, resultNotes, results, setNotes } = useBatteryStore();
    const [savingAction, setSavingAction] = useState<FinalAction | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const canCreatePlan = isAdmin || isProfessional;
    const hasAllResults = SFT_TESTS.every((test) => results[test.type] !== undefined);
    const isComplete = completedTests.length === SFT_TESTS.length && hasAllResults;

    const handleBackToCorrect = () => {
        router.replace(`/(app)/tests/${SFT_TESTS[SFT_TESTS.length - 1].type}/active` as never);
    };

    const handleClose = () => {
        if (isComplete) {
            finalizeAndNavigate('patient');
        } else {
            clearSession();
            router.replace(`/(app)/patients/${id}` as never);
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
            const destination = action === 'plan'
                ? `/(app)/patients/${id}/progress/edit-plan`
                : `/(app)/patients/${id}`;
            router.replace(destination as never);
        } catch (error) {
            if (batteryPersisted) {
                clearSession();
                const message = error instanceof Error
                    ? `Batería guardada. La generación del plan falló: ${error.message}. Reintenta desde el detalle.`
                    : 'Batería guardada. La generación del plan falló. Reintenta desde el detalle.';
                console.error('Error generando plan tras persistir batería:', error);
                setSnackbar({ visible: true, message, type: 'error' });
                setTimeout(() => {
                    router.replace(`/(app)/patients/${id}` as never);
                }, 2000);
            } else {
                const message = error instanceof Error ? error.message : 'Error al guardar la bateria.';
                setSnackbar({ visible: true, message, type: 'error' });
                setSavingAction(null);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Resumen bateria SFT',
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
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
                </View>
                <AppButton
                    label="Corregir ultima prueba"
                    variant="text"
                    icon="pencil"
                    onPress={handleBackToCorrect}
                    style={styles.correctBtn}
                />
                {SFT_TESTS.map((test) => {
                    const value = results[test.type];
                    const missing = value === undefined;

                    return (
                        <AppCard key={test.type} style={styles.resultCard}>
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
                    accessibilityLabel="Observaciones generales de la bateria"
                />
            </ScrollView>

            <StickyBottomBar>
                <AppButton
                    label={canCreatePlan ? 'Crear plan de ejercicios' : 'Volver al adulto mayor'}
                    icon={canCreatePlan ? 'robot' : 'account-arrow-left'}
                    variant="filled"
                    onPress={() => finalizeAndNavigate(canCreatePlan ? 'plan' : 'patient')}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    progressHeader: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151', marginBottom: 6 },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: 6, width: '100%' },
    correctBtn: { marginBottom: 16, alignSelf: 'flex-start' },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 32 },
    resultCard: { marginBottom: 8 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    resultInfo: { flex: 1 },
    testName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    testShort: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    valueContainer: { alignItems: 'flex-end', minWidth: 72 },
    value: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },
    unit: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    notesInput: { marginTop: 16 },
    notesOutline: { borderRadius: 12 },
});
