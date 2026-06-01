import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { assignCaregiver, fetchAssignedCaregivers, fetchProfessionalCaregivers, unassignCaregiver } from '@/src/services/patientService';
import type { CaregiverResult } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Searchbar, Text, useTheme } from 'react-native-paper';

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
    const [professionalCaregivers, setProfessionalCaregivers] = useState<CaregiverResult[]>([]);
    const [assigned, setAssigned] = useState<AssignedCaregiver[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    const assignedIds = useMemo(() => new Set(assigned.map((a) => a.caregiver_id)), [assigned]);

    const availableCaregivers = useMemo(() => {
        const normalized = searchQuery.toLowerCase().trim();
        return professionalCaregivers.filter((c) => {
            if (assignedIds.has(c.id)) return false;
            if (!normalized || normalized.length < 2) return true;
            return c.full_name.toLowerCase().includes(normalized) || c.email.toLowerCase().includes(normalized);
        });
    }, [professionalCaregivers, assignedIds, searchQuery]);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const [assignedData, caregiversData] = await Promise.all([
                    fetchAssignedCaregivers(id),
                    fetchProfessionalCaregivers(),
                ]);
                setAssigned(assignedData as unknown as AssignedCaregiver[]);
                setProfessionalCaregivers(caregiversData);
            } catch (error) {
                console.error('Error cargando cuidadores:', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    const handleAssign = async (caregiverId: string) => {
        if (!id || !user) {
            setSnackbar({ 
                visible: true, 
                message: 'Error: datos de sesión incompletos', 
                type: 'error' 
            });
            return;
        }
        
        try {
            await assignCaregiver(caregiverId, id, user.id);
            setSnackbar({ visible: true, message: 'Cuidador asignado correctamente ✓', type: 'success' });
            
            const data = await fetchAssignedCaregivers(id);
            setAssigned(data as unknown as AssignedCaregiver[]);
            setSearchQuery('');
        } catch (error) {
            console.error('Assignment error:', error);
            const msg = error instanceof Error ? error.message : 'Error asignando cuidador.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    const handleUnassign = async (caregiverId: string) => {
        if (!id) {
            setSnackbar({ 
                visible: true, 
                message: 'Error: ID de adulto mayor no encontrado', 
                type: 'error' 
            });
            return;
        }
        
        try {
            console.log('Unassigning caregiver:', caregiverId, 'from patient:', id);
            await unassignCaregiver(caregiverId, id);
            setAssigned((prev) => prev.filter((a) => a.caregiver_id !== caregiverId));
            setSnackbar({ visible: true, message: 'Cuidador desasignado correctamente ✓', type: 'success' });
        } catch (error) {
            console.error('Unassignment error:', error);
            const msg = error instanceof Error ? error.message : 'Error desasignando cuidador.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    if (isLoading) return <AppLoader />;

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchSection}>
                <Searchbar
                    placeholder="Filtrar cuidadores por nombre o email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                />
            </View>

            {/* Available caregivers */}
            <Text style={styles.sectionTitle}>
                Cuidadores disponibles{searchQuery.length >= 2 ? ` (${availableCaregivers.length})` : ''}
            </Text>
            {availableCaregivers.length === 0 ? (
                <Text style={styles.emptyText}>
                    {searchQuery.length >= 2
                        ? 'No se encontraron cuidadores con ese nombre o email.'
                        : 'No hay cuidadores disponibles.'}
                </Text>
            ) : (
                <FlatList
                    data={availableCaregivers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <AppCard>
                            <View style={styles.row}>
                                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                <Text style={styles.name}>{item.full_name}</Text>
                                <AppButton label="Asignar" variant="filled" onPress={() => handleAssign(item.id)} />
                            </View>
                        </AppCard>
                    )}
                    style={styles.list}
                />
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
                    style={styles.list}
                />
            )}

            <AppSnackbar visible={snackbar.visible} message={snackbar.message} type={snackbar.type} onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    searchSection: { marginBottom: 16 },
    searchbar: { borderRadius: 12, elevation: 1 },
    searchInput: { fontFamily: 'Montserrat_400Regular', fontSize: 14 },
    list: { marginBottom: 16 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937', flex: 1 },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
