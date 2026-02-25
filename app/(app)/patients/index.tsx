import { PatientCard } from '@/src/components/patients/PatientCard';
import { PatientSectionList } from '@/src/components/patients/PatientSectionList';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { usePermissions } from '@/src/hooks/usePermissions';
import { fetchActivePlanStatus, fetchBatteryCountsForPatients } from '@/src/services/batteryService';
import { fetchPatients } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { getSectionedPatients, usePatientsStore } from '@/src/stores/patientsStore';
import type { Patient, SectionedPatients } from '@/src/types/patient.types';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';

/**
 * RF-05 / RF-10: Patient list with search and optional sectioned view.
 */
export default function PatientsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { isProfessional } = usePermissions();
    const { patients, setPatients, searchQuery, setSearchQuery, isLoading, setLoading } = usePatientsStore();
    const [sections, setSections] = useState<SectionedPatients | null>(null);
    const [batteryCounts, setBatteryCounts] = useState<Record<string, number>>({});
    const [activePlans, setActivePlans] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const role = isProfessional ? 'professional' : 'caregiver';
                const data = await fetchPatients(user.id, role);
                setPatients(data);

                if (isProfessional && data.length > 0) {
                    const ids = data.map((p) => p.id);
                    const [counts, plans] = await Promise.all([
                        fetchBatteryCountsForPatients(ids),
                        fetchActivePlanStatus(ids),
                    ]);
                    setBatteryCounts(counts);
                    setActivePlans(plans);
                    setSections(getSectionedPatients(data, counts, plans));
                }
            } catch (error) {
                console.error('Error cargando pacientes:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user, isProfessional, setPatients, setLoading]);

    const filteredPatients = patients.filter((p) => {
        const fullName = `${p.first_name} ${p.second_name ?? ''} ${p.first_lastname} ${p.second_lastname ?? ''}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
    });

    const handlePatientPress = (patient: Patient) => {
        router.push(`/(app)/patients/${patient.id}` as never);
    };

    if (isLoading) {
        return <AppLoader message="Cargando pacientes..." />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder="Buscar paciente..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchbar}
                    inputStyle={styles.searchInput}
                    accessibilityLabel="Buscar paciente"
                />
            </View>

            {isProfessional && sections && !searchQuery ? (
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
    searchbar: {
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
});
