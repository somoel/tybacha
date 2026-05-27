import { TestCard } from '@/src/components/tests/TestCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, useTheme } from 'react-native-paper';

/**
 * Dedicated SFT battery mode. The user enters from a patient profile,
 * completes all tests, and must confirm before leaving an active session.
 */
export default function NewBatteryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();
    const { startBattery, results, completedTests, activeBatteryId, resetBattery } = useBatteryStore();
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);

    useEffect(() => {
        if (!activeBatteryId && id) {
            startBattery(id);
        }
    }, [id, activeBatteryId, startBattery]);

    const progress = completedTests.length / SFT_TESTS.length;
    const allComplete = completedTests.length === SFT_TESTS.length;
    const hasActiveSession = Boolean(activeBatteryId);

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

        router.replace(`/(app)/patients/${id}` as never);
    };

    const handleReviewSummary = () => {
        if (!id) return;
        allowExitRef.current = true;
        router.replace(`/(app)/patients/${id}/batteries/summary` as never);
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.topBarText}>
                    <Text style={styles.modeLabel}>Realizar bateria SFT</Text>
                    <Text style={styles.progressText}>
                        {completedTests.length} de {SFT_TESTS.length} pruebas completadas
                    </Text>
                </View>
                <IconButton
                    icon="close"
                    mode="contained-tonal"
                    size={20}
                    onPress={handleRequestExit}
                    accessibilityLabel="Salir de la bateria"
                />
            </View>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

                {allComplete && (
                    <AppButton
                        label="Revisar resultados"
                        variant="filled"
                        icon="clipboard-check"
                        onPress={handleReviewSummary}
                        style={styles.saveBtn}
                        accessibilityLabel="Revisar resultados de la bateria"
                    />
                )}
            </ScrollView>

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
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
    topBarText: { flex: 1, paddingRight: 12 },
    modeLabel: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: '#1f2937', marginBottom: 2 },
    progressText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden' },
    progressFill: { height: 6 },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 32 },
    saveBtn: { marginTop: 20 },
});
