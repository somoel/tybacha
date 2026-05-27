import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { usePermissions } from '@/src/hooks/usePermissions';
import { createBattery, saveBatteryWithResults } from '@/src/services/batteryService';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

type FinalAction = 'patient' | 'plan';

export default function BatterySummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const isOnline = useSyncStore((s) => s.isOnline);
    const { activeBatteryId, clearSession, completedTests, results } = useBatteryStore();
    const [savingAction, setSavingAction] = useState<FinalAction | null>(null);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const canCreatePlan = isAdmin || isProfessional;
    const isComplete = completedTests.length === SFT_TESTS.length;

    const handleBackToCorrect = () => {
        router.replace(`/(app)/tests/${SFT_TESTS[SFT_TESTS.length - 1].type}/active` as never);
    };

    const finalizeAndNavigate = async (action: FinalAction) => {
        if (!user || !id || !activeBatteryId || !isComplete) {
            setSnackbar({ visible: true, message: 'Completa todas las pruebas antes de finalizar.', type: 'error' });
            return;
        }

        setSavingAction(action);
        try {
            const battery = await createBattery(id, user.id, 'Bateria SFT completada', isOnline);
            const savedBattery = await saveBatteryWithResults(battery.id, results, isOnline);

            clearSession();

            if (action === 'plan') {
                router.replace(`/(app)/results?patientId=${id}&batteryId=${savedBattery.batteryId}&createPlan=1` as never);
                return;
            }

            router.replace(`/(app)/patients/${id}` as never);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al guardar la bateria.';
            setSnackbar({ visible: true, message, type: 'error' });
        } finally {
            setSavingAction(null);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <IconButton
                    icon="arrow-left"
                    mode="contained-tonal"
                    size={20}
                    onPress={handleBackToCorrect}
                    accessibilityLabel="Volver para corregir"
                />
                <View style={styles.topBarText}>
                    <Text style={styles.modeLabel}>Resumen bateria SFT</Text>
                    <Text style={styles.progressText}>{completedTests.length} de {SFT_TESTS.length} pruebas completadas</Text>
                </View>
                <IconButton
                    icon="close"
                    mode="contained-tonal"
                    size={20}
                    onPress={() => finalizeAndNavigate('patient')}
                    accessibilityLabel="Finalizar y volver al adulto mayor"
                    disabled={savingAction !== null}
                />
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scroll}>
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

                <AppButton
                    label={canCreatePlan ? 'Crear plan de ejercicios' : 'Volver al adulto mayor'}
                    icon={canCreatePlan ? 'robot' : 'account-arrow-left'}
                    variant="filled"
                    onPress={() => finalizeAndNavigate(canCreatePlan ? 'plan' : 'patient')}
                    loading={savingAction !== null}
                    disabled={!isComplete}
                    style={styles.finalButton}
                    accessibilityLabel={canCreatePlan ? 'Crear plan de ejercicios' : 'Volver al adulto mayor'}
                />
            </ScrollView>

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
    topBar: {
        backgroundColor: '#ffffff',
        borderBottomColor: '#e5e7eb',
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    topBarText: { flex: 1, paddingHorizontal: 12 },
    modeLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937', marginBottom: 2 },
    progressText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13, color: '#6b7280' },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden' },
    progressFill: { height: 6, width: '100%' },
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
    finalButton: { marginTop: 16 },
});
