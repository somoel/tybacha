import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { fetchBatteries } from '@/src/services/batteryService';
import type { SFTBattery } from '@/src/types/battery.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * Battery history for a patient.
 */
export default function BatteriesListScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const [batteries, setBatteries] = useState<SFTBattery[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const data = await fetchBatteries(id);
                setBatteries(data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    if (isLoading) return <AppLoader />;

    return (
        <View style={styles.container}>
            {batteries.length === 0 ? (
                <View style={styles.empty}>
                    <MaterialCommunityIcons name="clipboard-text-off" size={48} color={theme.colors.outline} />
                    <Text style={styles.emptyText}>No hay baterías registradas.</Text>
                </View>
            ) : (
                <FlatList
                    data={batteries}
                    keyExtractor={(b) => b.id}
                    renderItem={({ item }) => (
                        <AppCard onPress={() => router.push(`/(app)/patients/${id}/batteries/${item.id}` as never)}>
                            <View style={styles.row}>
                                <MaterialCommunityIcons name="clipboard-check" size={28} color={theme.colors.primary} />
                                <View style={styles.info}>
                                    <Text style={styles.date}>
                                        {format(new Date(item.performed_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                                    </Text>
                                    {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                                    {!item.is_synced && (
                                        <View style={styles.syncBadge}>
                                            <MaterialCommunityIcons name="cloud-sync" size={12} color="#f59e0b" />
                                            <Text style={styles.syncText}>Pendiente sincronización</Text>
                                        </View>
                                    )}
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} />
                            </View>
                        </AppCard>
                    )}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280' },
    list: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    info: { flex: 1, gap: 2 },
    date: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#1f2937' },
    notes: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    syncText: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#f59e0b' },
});
