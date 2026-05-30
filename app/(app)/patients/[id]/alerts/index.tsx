import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchApiAlerts, deleteApiAlert } from '@/src/api/alertsApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import type { ApiAlert } from '@/src/types/apiAlert.types';

const TYPE_LABELS: Record<string, string> = {
    recordatorio_ejercicio: 'Recordatorio',
    cumplimiento: 'Cumplimiento',
    progreso: 'Progreso',
    sistema: 'Sistema',
    otro: 'Otro',
};

const STATUS_COLORS: Record<string, string> = {
    activa: '#2e7d32',
    pausada: '#f59e0b',
    finalizada: '#6b7280',
    cancelada: '#c62828',
};

export default function AlertsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [alerts, setAlerts] = useState<ApiAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await fetchApiAlerts({ idAdultoMayor: Number(id), limit: 50 });
            setAlerts(data);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleDelete = useCallback(async (alertId: number) => {
        await deleteApiAlert(alertId);
        setAlerts((prev) => prev.filter((a) => a.idAlertaProgramada !== alertId));
    }, []);

    if (isLoading) return <AppLoader />;

    return (
        <View style={styles.container}>
            <FlatList
                data={alerts}
                keyExtractor={(item) => String(item.idAlertaProgramada)}
                contentContainerStyle={alerts.length === 0 ? styles.emptyContainer : styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                renderItem={({ item }) => (
                    <AppCard style={styles.alertCard}>
                        <View style={styles.alertHeader}>
                            <View style={styles.alertInfo}>
                                <Text style={styles.alertTitle}>{item.titulo}</Text>
                                <Text style={styles.alertType}>{TYPE_LABELS[item.tipoAlerta] ?? item.tipoAlerta}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.estado] ?? '#6b7280'}20` }]}>
                                <Text style={[styles.statusText, { color: STATUS_COLORS[item.estado] ?? '#6b7280' }]}>
                                    {item.estado}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.alertMessage}>{item.mensaje}</Text>
                        {item.fechaProgramada && (
                            <Text style={styles.alertDate}>
                                Programada: {new Date(item.fechaProgramada).toLocaleDateString('es-CO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        )}
                        {item.estado === 'activa' && (
                            <Pressable
                                style={styles.deleteButton}
                                onPress={() => handleDelete(item.idAlertaProgramada)}
                            >
                                <MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
                                <Text style={styles.deleteText}>Cancelar</Text>
                            </Pressable>
                        )}
                    </AppCard>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="bell-off-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>Sin alertas</Text>
                        <Text style={styles.emptyMessage}>No hay alertas programadas para este paciente.</Text>
                    </View>
                }
            />
            <View style={styles.fab}>
                <AppButton
                    label="Nueva alerta"
                    variant="filled"
                    icon="plus"
                    onPress={() => router.push(`/(app)/patients/${id}/alerts/new` as never)}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    list: {
        padding: 16,
        paddingBottom: 80,
    },
    emptyContainer: {
        flex: 1,
    },
    alertCard: {
        marginBottom: 12,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    alertInfo: {
        flex: 1,
    },
    alertTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
    },
    alertType: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
    },
    alertMessage: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#4b5563',
        lineHeight: 18,
    },
    alertDate: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 8,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 4,
    },
    deleteText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        color: '#c62828',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 64,
        gap: 8,
    },
    emptyTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#1f2937',
    },
    emptyMessage: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
    },
});
