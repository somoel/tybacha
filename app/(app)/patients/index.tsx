import { PatientCard } from '@/src/components/patients/PatientCard';
import { PatientSectionList } from '@/src/components/patients/PatientSectionList';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchActivePlanStatus, fetchBatteryCountsForPatients } from '@/src/services/batteryService';
import { fetchPatients } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { getSectionedPatients, usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient, SectionedPatients } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Searchbar } from 'react-native-paper';

/**
 * RF-05 / RF-10: Patient list with search and optional sectioned view.
 */
export default function PatientsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional } = usePermissions();
    const { patients, setPatients, searchQuery, setSearchQuery, isLoading, setLoading } = usePatientsStore();
    const [sections, setSections] = useState<SectionedPatients | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadPatients = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (!user) return;

        if (mode === 'refresh') {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const hasStaffAccess = isAdmin || isProfessional;
            const role = hasStaffAccess ? 'profesional' : 'cuidador';
            const data = await fetchPatients(user.id, role);
            setPatients(data);

            if (hasStaffAccess && data.length > 0) {
                const ids = data.map((p) => p.id);
                const [counts, plans] = await Promise.all([
                    fetchBatteryCountsForPatients(ids),
                    fetchActivePlanStatus(ids),
                ]);
                setSections(getSectionedPatients(data, counts, plans));
            } else {
                setSections(null);
            }
        } catch (error) {
            console.error('Error cargando adultos mayores:', error);
        } finally {
            if (mode === 'refresh') {
                setIsRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [user, isAdmin, isProfessional, setPatients, setLoading]);

    useEffect(() => {
        void loadPatients();
    }, [loadPatients]);

    const hasStaffAccess = isAdmin || isProfessional;

    const filteredPatients = patients.filter((p) => {
        const fullName = `${p.first_name} ${p.second_name ?? ''} ${p.first_lastname} ${p.second_lastname ?? ''}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const handlePatientPress = (patient: Patient) => {
        router.push(`/(app)/patients/${patient.id}` as never);
    };

    if (isLoading) {
        return <AppLoader message="Cargando adultos mayores..." />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    <Searchbar
                        placeholder="Buscar adulto mayor..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchbar}
                        inputStyle={styles.searchInput}
                        accessibilityLabel="Buscar adulto mayor"
                    />
                    <Pressable
                        style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
                        onPress={() => void loadPatients('refresh')}
                        disabled={isRefreshing}
                        accessibilityLabel="Refrescar adultos mayores"
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

            {hasStaffAccess && sections && !searchQuery ? (
                <PatientSectionList
                    sections={sections}
                    onPatientPress={handlePatientPress}
                />
            ) : (
                <FlatList
                    data={filteredPatients}
                    keyExtractor={(p) => p.id}
                    renderItem={({ item }) => (
                        <PatientCard
                            patient={item}
                            onPress={() => handlePatientPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Floating Action Button for adding new patients */}
            {hasStaffAccess && (
                <Pressable
                    style={styles.fab}
                    onPress={() => router.push('/(app)/patients/new' as never)}
                    accessibilityLabel="Agregar nuevo adulto mayor"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
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
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
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
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#007AFF',
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
});
