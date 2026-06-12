import { ExercisePlanSection } from '@/src/components/results/ExercisePlanSection';
import { AppCard } from '@/src/components/ui/AppCard';
import { BatteryDetailSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { fetchBatteryWithResults } from '@/src/services/batteryService';
import type { BatteryWithResults } from '@/src/types/battery.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ExercisePlanScreen() {
    const { id: patientId, batteryId } = useLocalSearchParams<{ id: string; batteryId: string }>();
    const [battery, setBattery] = useState<BatteryWithResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!batteryId) return;
            try {
                const data = await fetchBatteryWithResults(batteryId);
                setBattery(data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [batteryId]);

    if (isLoading) return <BatteryDetailSkeleton />;
    if (!battery || !patientId) return <BatteryDetailSkeleton />;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <AppCard style={styles.infoCard}>
                <Text style={styles.infoTitle}>Bateria de evaluacion</Text>
                <Text style={styles.infoDate}>
                    {format(new Date(battery.performed_at), "dd 'de' MMMM yyyy", { locale: es })}
                </Text>
                <Text style={styles.infoTests}>{battery.results.length} pruebas completadas</Text>
            </AppCard>

            <ExercisePlanSection
                patientId={patientId}
                battery={battery}
            />

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    infoCard: { marginBottom: 16 },
    infoTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    infoDate: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 2 },
    infoTests: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 4 },
    bottomPadding: { height: 32 },
});
