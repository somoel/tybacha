import { BodyMetricsInput } from '@/src/components/battery/BodyMetricsInput';
import { TestCard } from '@/src/components/tests/TestCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { StickyBottomBar } from '@/src/components/ui/StickyBottomBar';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { useBatteryStore } from '@/src/stores/batteryStore';
import { useSyncStore } from '@/src/stores/syncStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Dialog, IconButton, Portal, Text, useTheme } from 'react-native-paper';

/**
 * Dedicated SFT battery mode. The user enters from a patient profile,
 * completes all tests, and must confirm before leaving an active session.
 */
export default function NewBatteryScreen() {
    const { id, patientName } = useLocalSearchParams<{ id: string; patientName?: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const theme = useTheme();
    const isOnline = useSyncStore((s) => s.isOnline);
    const { startBattery, results, completedTests, activeBatteryId, resetBattery, setBodyMetrics, pesoKg } = useBatteryStore();
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const allowExitRef = useRef(false);
    const pendingNavigationActionRef = useRef<unknown>(null);
    const metricsConfirmed = pesoKg !== null;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!activeBatteryId && id) {
            startBattery(id);
        }
    }, [id, activeBatteryId, startBattery]);

    const progress = completedTests.length / SFT_TESTS.length;
    const allComplete = completedTests.length === SFT_TESTS.length;
    const hasActiveSession = Boolean(activeBatteryId);

    useEffect(() => {
        if (allComplete) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [allComplete, fadeAnim]);

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

    const handleBodyMetricsConfirm = (peso: number, estatura: number) => {
        setBodyMetrics(peso, estatura);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: patientName ? `${patientName} — Batería SFT` : 'Realizar batería SFT',
                    headerRight: () => (
                        <IconButton icon="close" size={24} onPress={handleRequestExit} />
                    ),
                }}
            />

            <ScrollView style={styles.content} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {!isOnline && (
                    <View style={[styles.offlineBanner, { backgroundColor: theme.colors.errorContainer }]}>
                        <MaterialCommunityIcons name="wifi-off" size={16} color={theme.colors.onErrorContainer} />
                        <Text style={[styles.offlineText, { color: theme.colors.onErrorContainer }]}>
                            Sin conexión — se guardará localmente
                        </Text>
                    </View>
                )}

                {!metricsConfirmed ? (
                    <BodyMetricsInput onConfirm={handleBodyMetricsConfirm} />
                ) : (
                    <>
                        <Text style={styles.progressHeader}>
                            {completedTests.length} de {SFT_TESTS.length} pruebas completadas
                        </Text>
                        <View
                            style={styles.progressTrack}
                            accessibilityRole="progressbar"
                            accessibilityValue={{ min: 0, max: SFT_TESTS.length, now: completedTests.length, text: `${completedTests.length} de ${SFT_TESTS.length} pruebas completadas` }}
                        >
                            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                        </View>
                        {SFT_TESTS.map((test, index) => {
                            const isCompleted = completedTests.includes(test.type);
                            const resultValue = results[test.type];
                            return (
                                <TestCard
                                    key={test.type}
                                    test={test}
                                    isCompleted={isCompleted}
                                    resultValue={resultValue}
                                    index={index + 1}
                                    total={SFT_TESTS.length}
                                    onPress={() => router.push(`/(app)/tests/${test.type}/active` as never)}
                                />
                            );
                        })}

                        {allComplete && (
                            <View style={{ height: 16 }} />
                        )}
                    </>
                )}
            </ScrollView>

            {allComplete && (
                <Animated.View style={{ opacity: fadeAnim }}>
                    <StickyBottomBar>
                        <AppButton
                            label="Revisar resultados"
                            variant="filled"
                            icon="clipboard-check"
                            onPress={handleReviewSummary}
                            accessibilityLabel="Revisar resultados de la batería"
                        />
                    </StickyBottomBar>
                </Animated.View>
            )}

            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
            />
            <Portal>
                <Dialog visible={exitDialogVisible} onDismiss={handleCancelExit}>
                    <Dialog.Title>Salir de la batería</Dialog.Title>
                    <Dialog.Content>
                        <Text>Si sales ahora se perderán los resultados no guardados. ¿Desea salir?</Text>
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
    offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderRadius: 10 },
    offlineText: { fontFamily: 'Montserrat_500Medium', fontSize: 12, flex: 1 },
    progressHeader: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#374151', marginBottom: 6 },
    progressTrack: { height: 6, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 16 },
    progressFill: { height: 6 },
    content: { flex: 1 },
    scroll: { padding: 16, paddingBottom: 32 },
});
