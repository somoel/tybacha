import { PatientCard } from '@/src/components/patients/PatientCard';
import { PatientSectionList } from '@/src/components/patients/PatientSectionList';
import { PatientsListSkeleton } from '@/src/components/ui/PatientsListSkeleton';
import { usePermissions } from '@/src/hooks/usePermissions';
import { exportBulkBatteryXlsx } from '@/src/api/reportsApi';
import { fetchActivePlanStatus, fetchBatteryCountsForPatients, fetchWeeklyExerciseDataForPatients } from '@/src/services/batteryService';
import { fetchPatients, fetchPatientThumbnails } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { getSectionedPatients, usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient, SectionedPatients } from '@/src/types/patient.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Searchbar, Text } from 'react-native-paper';

/**
 * RF-05 / RF-10: Patient list with search and optional sectioned view.
 */
export default function PatientsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isAdmin, isProfessional, isCaregiver } = usePermissions();
    const hasStaffAccess = isAdmin || isProfessional;
    const { patients, setPatients, searchQuery, setSearchQuery, isLoading, setLoading, setPhotoThumbnails, exerciseData, setExerciseData } = usePatientsStore();
    const [sections, setSections] = useState<SectionedPatients | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activePlanMap, setActivePlanMap] = useState<Record<string, boolean>>({});
    const [batteryCounts, setBatteryCounts] = useState<Record<string, number>>({});
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);

    const loadPatients = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (!user) return;

        if (mode === 'refresh') {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const role = hasStaffAccess ? 'profesional' : 'cuidador';
            const data = await fetchPatients(user.id, role);
            setPatients(data);

            if (data.length > 0) {
                const ids = data.map((p) => p.id);
                const [counts, plans, weeklyData] = await Promise.all([
                    fetchBatteryCountsForPatients(ids),
                    fetchActivePlanStatus(ids),
                    fetchWeeklyExerciseDataForPatients(ids),
                ]);
                setBatteryCounts(counts);
                setActivePlanMap(plans);
                setExerciseData(weeklyData);

                if (hasStaffAccess) {
                    setSections(getSectionedPatients(data, counts, plans));
                } else {
                    setSections(null);
                }
            } else {
                setSections(null);
            }

            const thumbnails = await fetchPatientThumbnails();
            setPhotoThumbnails(thumbnails);
        } catch (error) {
            console.error('Error cargando adultos mayores:', error);
        } finally {
            if (mode === 'refresh') {
                setIsRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [user, hasStaffAccess, setPatients, setLoading, setPhotoThumbnails, setExerciseData]);

    useEffect(() => {
        void loadPatients();
    }, [loadPatients]);

    const toggleSelectionMode = useCallback(() => {
        setSelectionMode((prev) => !prev);
        setSelectedIds(new Set());
    }, []);

    const togglePatientSelection = useCallback((patient: Patient) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(patient.id)) {
                next.delete(patient.id);
            } else {
                next.add(patient.id);
            }
            return next;
        });
    }, []);

    const handleBulkExport = useCallback(async () => {
        const ids = [...selectedIds].map(Number);
        if (ids.length === 0) {
            Alert.alert('Sin selección', 'Selecciona al menos un paciente para exportar.');
            return;
        }
        setIsExporting(true);
        try {
            const blob = await exportBulkBatteryXlsx(ids);
            const url = URL.createObjectURL(blob);
            if (Platform.OS === 'web') {
                const a = document.createElement('a');
                a.href = url;
                a.download = `baterias-sft-masivo-${ids.length}-pacientes.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
            setSelectionMode(false);
            setSelectedIds(new Set());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al exportar';
            Alert.alert('Error', message);
        } finally {
            setIsExporting(false);
        }
    }, [selectedIds]);

    const filteredPatients = patients.filter((p) => {
        const fullName = `${p.first_name} ${p.second_name ?? ''} ${p.first_lastname} ${p.second_lastname ?? ''}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const handlePatientPress = (patient: Patient) => {
        if (selectionMode) return;
        router.push(`/(app)/patients/${patient.id}` as never);
    };

    if (isLoading) {
        return <PatientsListSkeleton />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                    {hasStaffAccess && !searchQuery && (
                        <Pressable
                            style={[styles.selectButton, selectionMode && styles.selectButtonActive]}
                            onPress={toggleSelectionMode}
                            accessibilityLabel={selectionMode ? 'Cancelar selección' : 'Seleccionar pacientes'}
                            accessibilityRole="button"
                        >
                            <MaterialCommunityIcons
                                name={selectionMode ? 'close' : 'checkbox-multiple-marked-outline'}
                                size={20}
                                color={selectionMode ? '#ffffff' : '#006d77'}
                            />
                            {selectionMode && (
                                <Text style={styles.selectButtonText}>
                                    {selectedIds.size > 0 ? selectedIds.size : ''}
                                </Text>
                            )}
                        </Pressable>
                    )}
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
                    activePlanMap={activePlanMap}
                    exerciseData={exerciseData}
                    batteryCounts={batteryCounts}
                    isCaregiver={false}
                    onPatientPress={handlePatientPress}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={togglePatientSelection}
                />
            ) : (
                <FlatList
                    data={filteredPatients}
                    keyExtractor={(p) => p.id}
                    renderItem={({ item }) => (
                        <PatientCard
                            patient={item}
                            batteryCount={batteryCounts[item.id]}
                            hasActivePlan={activePlanMap[item.id]}
                            weeklyExerciseData={exerciseData[item.id]}
                            showQuickActions={isCaregiver}
                            onExercisePress={() => router.push(`/(app)/patients/${item.id}/exercise` as never)}
                            onPress={() => handlePatientPress(item)}
                            selectionMode={selectionMode}
                            selected={selectedIds.has(item.id)}
                            onToggleSelect={() => togglePatientSelection(item)}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB: Export in selection mode, Add new patient otherwise */}
            {hasStaffAccess && selectionMode ? (
                <Pressable
                    style={[styles.fab, styles.fabExport, isExporting && styles.fabDisabled]}
                    onPress={handleBulkExport}
                    disabled={isExporting || selectedIds.size === 0}
                    accessibilityLabel={`Exportar ${selectedIds.size} pacientes seleccionados`}
                    accessibilityRole="button"
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="file-excel" size={22} color="#FFFFFF" />
                            <Text style={styles.fabText}>Exportar a Excel</Text>
                        </>
                    )}
                </Pressable>
            ) : hasStaffAccess ? (
                <Pressable
                    style={[styles.fab, { backgroundColor: '#006d77' }]}
                    onPress={() => router.push('/(app)/patients/new' as never)}
                    accessibilityLabel="Agregar nuevo adulto mayor"
                    accessibilityRole="button"
                >
                    <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                    <Text style={styles.fabText}>Nuevo adulto mayor</Text>
                </Pressable>
            ) : null}
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
    fabExport: {
        backgroundColor: '#059669',
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    fabDisabled: {
        opacity: 0.6,
    },
    fabText: {
        color: '#FFFFFF',
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
    selectButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
        flexDirection: 'row',
        gap: 2,
    },
    selectButtonActive: {
        backgroundColor: '#006d77',
        borderColor: '#006d77',
    },
    selectButtonText: {
        color: '#ffffff',
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
    },
});
