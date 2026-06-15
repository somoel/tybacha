import { CaregiverCard } from '@/src/components/caregivers/CaregiverCard';
import { PatientsListSkeleton } from '@/src/components/ui/PatientsListSkeleton';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchCaregivers, type CaregiverSummary } from '@/src/services/caregiverService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Searchbar, Text } from 'react-native-paper';

/**
 * Caregiver list screen matching patients list layout.
 */
export default function CaregiversListScreen() {
    const router = useRouter();
    const { isAdmin, isProfessional } = usePermissions();
    const hasAccess = isAdmin || isProfessional;

    const [caregivers, setCaregivers] = useState<CaregiverSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'refresh') {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const data = await fetchCaregivers(searchQuery.length >= 2 ? searchQuery : undefined);
            setCaregivers(data);
        } catch (error) {
            setSnackbar({
                visible: true,
                message: error instanceof Error ? error.message : 'Error cargando cuidadores',
                type: 'error',
            });
        } finally {
            if (mode === 'refresh') {
                setIsRefreshing(false);
            } else {
                setIsLoading(false);
            }
        }
    }, [searchQuery]);

    useFocusEffect(useCallback(() => {
        void load();
    }, [load]));

    if (!hasAccess) {
        return (
            <View style={styles.center}>
                <MaterialCommunityIcons name="lock-alert-outline" size={42} color="#6b7280" />
                <Text style={styles.empty}>No tiene permisos para ver cuidadores.</Text>
            </View>
        );
    }

    if (isLoading) {
        return <PatientsListSkeleton />;
    }

    const filteredCaregivers = searchQuery.length >= 2
        ? caregivers
        : caregivers.filter((c) => c.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    <Searchbar
                        placeholder="Buscar cuidador..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchbar}
                        inputStyle={styles.searchInput}
                        accessibilityLabel="Buscar cuidador"
                    />
                    <Pressable
                        style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
                        onPress={() => void load('refresh')}
                        disabled={isRefreshing}
                        accessibilityLabel="Refrescar cuidadores"
                        accessibilityRole="button"
                    >
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color="#006d77" />
                        ) : (
                            <MaterialCommunityIcons name="refresh" size={24} color="#006d77" />
                        )}
                    </Pressable>
                </View>
            </View>

            {filteredCaregivers.length === 0 ? (
                <View style={styles.center}>
                    <MaterialCommunityIcons name="account-heart-outline" size={48} color="#6b7280" />
                    <Text style={styles.emptyTitle}>
                        {searchQuery.length >= 2 ? 'Sin resultados' : 'Sin cuidadores'}
                    </Text>
                    <Text style={styles.empty}>
                        {searchQuery.length >= 2
                            ? 'No se encontraron cuidadores con ese nombre o correo.'
                            : 'Crea un cuidador con el botón + para comenzar.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCaregivers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <CaregiverCard
                            caregiver={item}
                            onPress={() => router.push(`/(app)/caregivers/${item.id}` as never)}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {hasAccess && (
                <Pressable
                    style={[styles.fab, { backgroundColor: '#006d77' }]}
                    onPress={() => router.push('/(app)/caregivers/new' as never)}
                    accessibilityLabel="Crear nuevo cuidador"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                    <Text style={styles.fabText}>Nuevo cuidador</Text>
                </Pressable>
            )}

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
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
    emptyTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginTop: 12 },
    empty: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchbar: {
        flex: 1,
        borderRadius: 12,
        elevation: 1,
    },
    searchInput: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 14,
    },
    refreshButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    refreshButtonDisabled: {
        opacity: 0.7,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        borderRadius: 16,
        minHeight: 56,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 4,
    },
    fabText: {
        color: '#FFFFFF',
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
});
