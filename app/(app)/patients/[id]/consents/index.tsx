import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchApiConsents, fetchApiConsentStatus, revokeApiConsent } from '@/src/api/consentsApi';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { ConsentsListSkeleton } from '@/src/components/ui/PatientDetailSkeletons';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import type { ApiConsent, ApiConsentStatusResponse } from '@/src/types/apiConsent.types';
import { Text, useTheme } from 'react-native-paper';

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
    tratamiento_datos: { label: 'Tratamiento de datos', icon: 'shield-check' },
    evaluacion_funcional: { label: 'Evaluación funcional', icon: 'clipboard-pulse' },
    plan_ejercicio: { label: 'Plan de ejercicio', icon: 'dumbbell' },
    investigacion: { label: 'Investigación', icon: 'flask' },
    otro: { label: 'Otro', icon: 'file-document-outline' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    vigente: { label: 'Vigente', color: '#2e7d32', bg: '#e8f5e9' },
    revocado: { label: 'Revocado', color: '#c62828', bg: '#ffebee' },
    vencido: { label: 'Vencido', color: '#f57c00', bg: '#fff3e0' },
    pendiente: { label: 'Pendiente', color: '#6b7280', bg: '#f0f3f6' },
};

export default function ConsentsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, isProfessional } = usePermissions();
    const canEdit = isAdmin || isProfessional;

    const [consents, setConsents] = useState<ApiConsent[]>([]);
    const [statusResponse, setStatusResponse] = useState<ApiConsentStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [revokeTarget, setRevokeTarget] = useState<number | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackType, setSnackType] = useState<'success' | 'error'>('success');

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const [status, consentsData] = await Promise.all([
                fetchApiConsentStatus(Number(id)),
                fetchApiConsents(Number(id)),
            ]);
            setStatusResponse(status);
            setConsents(consentsData);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const handleRevoke = useCallback(async () => {
        if (!revokeTarget) return;
        setIsRevoking(true);
        try {
            await revokeApiConsent(revokeTarget);
            setSnackMessage('Consentimiento revocado exitosamente');
            setSnackType('success');
            setSnackVisible(true);
            setRevokeTarget(null);
            await load();
        } catch {
            setSnackMessage('Error al revocar el consentimiento');
            setSnackType('error');
            setSnackVisible(true);
        } finally {
            setIsRevoking(false);
        }
    }, [revokeTarget, load]);

    if (isLoading) return <ConsentsListSkeleton />;

    return (
        <View style={styles.container}>
            {/* Status banner */}
            {statusResponse && (
                <AppCard
                    style={{
                        ...styles.statusBanner,
                        backgroundColor: statusResponse.tieneConsentimientoVigente ? '#e8f5e9' : '#ffebee',
                    }}
                    elevation={0}
                >
                    <View style={styles.statusRow}>
                        <MaterialCommunityIcons
                            name={statusResponse.tieneConsentimientoVigente ? 'shield-check' : 'shield-alert'}
                            size={24}
                            color={statusResponse.tieneConsentimientoVigente ? '#2e7d32' : '#c62828'}
                        />
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusTitle}>
                                {statusResponse.tieneConsentimientoVigente
                                    ? 'Consentimiento vigente'
                                    : 'Sin consentimiento vigente'}
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                {statusResponse.tieneConsentimientoVigente
                                    ? 'El adulto mayor cuenta con al menos un consentimiento activo.'
                                    : 'No hay consentimientos activos registrados.'}
                            </Text>
                        </View>
                    </View>
                </AppCard>
            )}

            <FlatList
                data={consents}
                keyExtractor={(item) => String(item.idConsentimientoAdultoMayor)}
                contentContainerStyle={consents.length === 0 ? styles.emptyContainer : styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                renderItem={({ item }) => {
                    const typeCfg = TYPE_CONFIG[item.tipoConsentimiento] ?? { label: item.tipoConsentimiento, icon: 'file-document-outline' };
                    const statusCfg = STATUS_CONFIG[item.estado] ?? { label: item.estado, color: '#6b7280', bg: '#f0f3f6' };

                    return (
                        <AppCard style={styles.consentCard}>
                            <View style={styles.consentHeader}>
                                <View style={styles.consentTypeRow}>
                                    <MaterialCommunityIcons
                                        name={typeCfg.icon as never}
                                        size={20}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={styles.consentType}>{typeCfg.label}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                                        {statusCfg.label}
                                    </Text>
                                </View>
                            </View>

                            {item.otorgadoPorNombre && (
                                <Text style={styles.consentDetail}>
                                    Otorgado por: {item.otorgadoPorNombre}
                                    {item.otorgadoPorDocumento ? ` (${item.otorgadoPorDocumento})` : ''}
                                </Text>
                            )}

                            {item.fechaOtorgamiento && (
                                <Text style={styles.consentDate}>
                                    Otorgado: {format(new Date(item.fechaOtorgamiento), 'dd MMM yyyy', { locale: es })}
                                </Text>
                            )}

                            {item.fechaVencimiento && (
                                <Text style={styles.consentDate}>
                                    Vence: {format(new Date(item.fechaVencimiento), 'dd MMM yyyy', { locale: es })}
                                </Text>
                            )}

                            {item.observaciones && (
                                <Text style={styles.consentObservations}>{item.observaciones}</Text>
                            )}

                            {item.estado === 'vigente' && canEdit && (
                                <View style={styles.revokeContainer}>
                                    <AppButton
                                        label="Revocar"
                                        variant="outlined-error"
                                        icon="close-circle"
                                        onPress={() => setRevokeTarget(item.idConsentimientoAdultoMayor)}
                                        accessibilityLabel={`Revocar consentimiento de ${typeCfg.label}`}
                                    />
                                </View>
                            )}
                        </AppCard>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="shield-check-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>Sin consentimientos</Text>
                        <Text style={styles.emptyMessage}>
                            No hay consentimientos registrados para este adulto mayor.
                        </Text>
                    </View>
                }
            />

            {canEdit && (
                <View style={styles.fab}>
                    <AppButton
                        label="Registrar consentimiento"
                        variant="filled"
                        icon="plus"
                        onPress={() => router.push(`/(app)/patients/${id}/consents/new` as never)}
                    />
                </View>
            )}

            <AppConfirmDialog
                visible={revokeTarget !== null}
                title="Revocar consentimiento"
                message="¿Está seguro de revocar este consentimiento? Esta acción no se puede deshacer."
                confirmLabel="Revocar"
                destructive
                loading={isRevoking}
                onConfirm={handleRevoke}
                onCancel={() => setRevokeTarget(null)}
            />

            <AppSnackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                message={snackMessage}
                type={snackType}
            />
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
    statusBanner: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        paddingVertical: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusInfo: {
        flex: 1,
    },
    statusTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
    },
    statusSubtitle: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#4b5563',
        marginTop: 2,
    },
    consentCard: {
        marginBottom: 12,
    },
    consentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    consentTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    consentType: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 15,
        color: '#1f2937',
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
    consentDetail: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#4b5563',
        marginBottom: 4,
    },
    consentDate: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    consentObservations: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 13,
        color: '#374151',
        marginTop: 6,
        fontStyle: 'italic',
    },
    revokeContainer: {
        marginTop: 12,
        alignSelf: 'flex-start',
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
