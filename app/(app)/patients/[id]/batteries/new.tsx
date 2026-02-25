import { TestCard } from '@/src/components/tests/TestCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { createBattery, saveBatteryResults } from '@/src/services/batteryService';
import { useAuthStore } from '@/src/stores/authStore';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

/**
 * RF-08: New SFT battery — shows all 7 tests, tracks completion, and saves results.
 */
export default function NewBatteryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuthStore();
    const isOnline = useSyncStore((s) => s.isOnline);
    const { startBattery, results, completedTests, activeBatteryId, resetBattery } = useBatteryStore();
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    // Start battery if not already started
    React.useEffect(() => {
        if (!activeBatteryId && id) {
            startBattery(id);
        }
    }, [id, activeBatteryId, startBattery]);

    const progress = completedTests.length / SFT_TESTS.length;
    const allComplete = completedTests.length === SFT_TESTS.length;

    const handleFinalize = async () => {
        if (!user || !id || !activeBatteryId) return;
        setIsSaving(true);
        try {
            const battery = await createBattery(id, user.id, undefined, isOnline);
            await saveBatteryResults(battery.id, results, isOnline);
            resetBattery();
            setSnackbar({ visible: true, message: 'Batería guardada exitosamente ✓', type: 'success' });
            setTimeout(() => router.back(), 1500);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al guardar batería.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Progress */}
                <View style={styles.progressSection}>
                    <Text style={styles.progressText}>
                        Progreso: {completedTests.length} de {SFT_TESTS.length} pruebas
                    </Text>
                    <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
                </View>

                {/* Test list */}
                {SFT_TESTS.map((test) => {
                    const isCompleted = completedTests.includes(test.type);
                    const resultValue = results[test.type];
                    return (
                        <TestCard
                            key={test.type}
                            test={test}
                            isCompleted={isCompleted}
                            resultValue={resultValue}
                            onPress={() => router.push(`/(app)/tests/${test.type}/active` as never)}
                        />
                    );
                })}

                {/* Finalize button */}
                {allComplete && (
                    <AppButton
                        label="Guardar batería completa"
                        variant="filled"
                        icon="check-all"
                        onPress={handleFinalize}
                        loading={isSaving}
                        style={styles.saveBtn}
                        accessibilityLabel="Guardar batería completa"
                    />
                )}
            </ScrollView>

            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 16, paddingBottom: 32 },
    progressSection: { marginBottom: 16 },
    progressText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937', marginBottom: 8 },
    progressBar: { borderRadius: 4, height: 8 },
    saveBtn: { marginTop: 20 },
});
