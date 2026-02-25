import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { assignCaregiver, fetchAssignedCaregivers, searchCaregivers, unassignCaregiver } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Searchbar, Text, useTheme } from 'react-native-paper';

interface CaregiverResult {
    id: string;
    full_name: string;
}

interface AssignedCaregiver {
    id: string;
    caregiver_id: string;
    profiles?: { full_name: string } | null;
}

/**
 * RF-03: Assign/unassign caregivers to a patient (professional only).
 */
export default function AssignCaregiverScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const { user } = useAuthStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<CaregiverResult[]>([]);
    const [assigned, setAssigned] = useState<AssignedCaregiver[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        const loadAssigned = async () => {
            if (!id) return;
            try {
                const data = await fetchAssignedCaregivers(id);
                setAssigned(data as unknown as AssignedCaregiver[]);
            } catch (error) {
                console.error('Error cargando cuidadores:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAssigned();
    }, [id]);

    const handleSearch = async () => {
        if (searchQuery.length < 2) return;
        setIsSearching(true);
        try {
            const data = await searchCaregivers(searchQuery);
            setResults(data);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error buscando.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAssign = async (caregiverId: string) => {
        if (!id || !user) return;
        try {
            await assignCaregiver(caregiverId, id, user.id);
            setSnackbar({ visible: true, message: 'Cuidador asignado ✓', type: 'success' });
            const data = await fetchAssignedCaregivers(id);
            setAssigned(data as unknown as AssignedCaregiver[]);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error asignando.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    const handleUnassign = async (caregiverId: string) => {
        if (!id) return;
        try {
            await unassignCaregiver(caregiverId, id);
            setAssigned((prev) => prev.filter((a) => a.caregiver_id !== caregiverId));
            setSnackbar({ visible: true, message: 'Cuidador removido ✓', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error removiendo.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    if (isLoading) return <AppLoader />;

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchSection}>
                <Searchbar
                    placeholder="Buscar cuidador por nombre o email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                />
                <AppButton label="Buscar" variant="filled" onPress={handleSearch} loading={isSearching} style={styles.searchBtn} />
            </View>

            {/* Search results */}
            {results.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resultados</Text>
                    {results.map((c) => (
                        <AppCard key={c.id}>
                            <View style={styles.row}>
                                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                <Text style={styles.name}>{c.full_name}</Text>
                                <AppButton label="Asignar" variant="filled" onPress={() => handleAssign(c.id)} />
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}

            {/* Assigned caregivers */}
            <Text style={styles.sectionTitle}>Cuidadores asignados</Text>
            {assigned.length === 0 ? (
                <Text style={styles.emptyText}>No hay cuidadores asignados.</Text>
            ) : (
                <FlatList
                    data={assigned}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <AppCard>
                            <View style={styles.row}>
                                <MaterialCommunityIcons name="account-check" size={24} color="#2e7d32" />
                                <Text style={styles.name}>{(item.profiles as { full_name: string } | undefined)?.full_name ?? 'Cuidador'}</Text>
                                <AppButton label="Remover" variant="outlined-error" onPress={() => handleUnassign(item.caregiver_id)} />
                            </View>
                        </AppCard>
                    )}
                />
            )}

            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    searchSection: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
    searchbar: { flex: 1, borderRadius: 12, elevation: 1 },
    searchInput: { fontFamily: 'Montserrat_400Regular', fontSize: 14 },
    searchBtn: { height: 48 },
    section: { marginBottom: 16 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937', flex: 1 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
