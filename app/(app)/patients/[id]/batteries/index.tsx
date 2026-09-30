import { AppCard } from '@/src/components/ui/AppCard';
import { BatteryListSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { listPendingOfflineOperations, type OfflineOperation } from '@/src/lib/offlineQueue';
import { fetchBatteries } from '@/src/services/batteryService';
import type { SFTBattery } from '@/src/types/battery.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/** Batería remota o borrador guardado localmente sin sincronizar. */
type BatteryListItem = SFTBattery & { localPending?: boolean };

function toLocalPendingItem(operation: OfflineOperation, patientId: string): BatteryListItem {
    const payload = operation.payload;
    return {
        id: operation.idLocal,
        patient_id: patientId,
        performed_by: '',
        performed_at:
            typeof payload.fechaAplicacion === 'string'
                ? payload.fechaAplicacion
                : operation.creadoEnLocal,
        notes: typeof payload.observaciones === 'string' ? payload.observaciones : undefined,
        is_synced: false,
        localPending: true,
    };
}

function isPendingBatteryForPatient(operation: OfflineOperation, patientId: string): boolean {
    return (
        operation.entidad === 'aplicacion_sft' &&
        Number(operation.payload.idAdultoMayor) === Number(patientId)
    );
}

/**
 * Battery history for a patient.
 * Includes batteries saved offline (still in the sync queue) at the top.
 */
export default function BatteriesListScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const [batteries, setBatteries] = useState<BatteryListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        let isActive = true;
        const load = async () => {
            if (!id) return;
            setIsLoading(true);

            const [remoteResult, queueResult] = await Promise.allSettled([
                fetchBatteries(id),
                listPendingOfflineOperations(),
            ]);

            if (!isActive) return;

            if (remoteResult.status === 'rejected') {
                console.error('Error cargando baterias del servidor:', remoteResult.reason);
            }

            const remote = remoteResult.status === 'fulfilled' ? remoteResult.value : [];
            const queue =
                queueResult.status === 'fulfilled' ? queueResult.value : [];
            if (queueResult.status === 'rejected') {
                console.error('Error leyendo la cola offline:', queueResult.reason);
            }

            const localPending = queue
                .filter((operation) => isPendingBatteryForPatient(operation, id))
                .map((operation) => toLocalPendingItem(operation, id))
                .sort((left, right) =>
                    new Date(right.performed_at).getTime() - new Date(left.performed_at).getTime(),
                );

            setBatteries([...localPending, ...remote]);
            setIsLoading(false);
        };
        load();
        return () => {
            isActive = false;
        };
    }, [id]));

    if (isLoading) return <BatteryListSkeleton />;

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
                    keyExtractor={(item) => (item.localPending ? `local-${item.id}` : item.id)}
                    renderItem={({ item }) => (
                        item.localPending ? (
                            <AppCard>
                                <View style={styles.row}>
                                    <MaterialCommunityIcons name="clipboard-clock" size={28} color={theme.colors.primary} />
                                    <View style={styles.info}>
                                        <Text style={styles.date}>
                                            {format(new Date(item.performed_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
                                        </Text>
                                        {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                                        <View style={styles.syncBadge}>
                                            <MaterialCommunityIcons name="cloud-sync" size={12} color="#f59e0b" />
                                            <Text style={styles.syncText}>Pendiente sincronización</Text>
                                        </View>
                                        <Text style={styles.localNote}>Guardada en este dispositivo</Text>
                                    </View>
                                </View>
                            </AppCard>
                        ) : (
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
                        )
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
    localNote: { fontFamily: 'Montserrat_400Regular', fontSize: 11, color: '#6b7280' },
});
