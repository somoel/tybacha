import { ResultChart } from '@/src/components/results/ResultChart';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { fetchBatteryWithResults } from '@/src/services/batteryService';
import type { BatteryWithResults } from '@/src/types/battery.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * Battery detail — shows all results with chart.
 */
export default function BatteryDetailScreen() {
    const { batteryId } = useLocalSearchParams<{ batteryId: string }>();
    const theme = useTheme();
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

    if (isLoading) return <AppLoader />;
    if (!battery) return <AppLoader message="Batería no encontrada" />;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <AppCard style={styles.headerCard}>
                <Text style={styles.date}>
                    {format(new Date(battery.performed_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                </Text>
                <Text style={styles.testCount}>{battery.results.length} pruebas registradas</Text>
                {battery.notes && <Text style={styles.notes}>{battery.notes}</Text>}
            </AppCard>

            {/* Chart */}
            {battery.results.length > 0 && (
                <AppCard>
                    <ResultChart results={battery.results} />
                </AppCard>
            )}

            {/* Individual results */}
            <Text style={styles.sectionTitle}>Resultados individuales</Text>
            {SFT_TESTS.map((test) => {
                const result = battery.results.find((r) => r.test_type === test.type);
                return (
                    <AppCard key={test.type}>
                        <View style={styles.resultRow}>
                            <View style={styles.resultInfo}>
                                <Text style={styles.testName}>{test.name}</Text>
                                <Text style={styles.testShort}>{test.shortName}</Text>
                            </View>
                            <View style={styles.valueContainer}>
                                <Text style={[styles.value, { color: result ? theme.colors.primary : theme.colors.outline }]}>
                                    {result ? result.value : '—'}
                                </Text>
                                <Text style={styles.unit}>{result ? test.unit : ''}</Text>
                            </View>
                        </View>
                    </AppCard>
                );
            })}
            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    headerCard: { marginBottom: 16 },
    date: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937' },
    testCount: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginTop: 2 },
    notes: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#374151', marginTop: 6, fontStyle: 'italic' },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginTop: 16, marginBottom: 10 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultInfo: { flex: 1 },
    testName: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    testShort: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    valueContainer: { alignItems: 'flex-end' },
    value: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 22 },
    unit: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
    bottomPadding: { height: 32 },
});
