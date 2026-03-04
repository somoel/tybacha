import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppLoader } from '@/src/components/ui/AppLoader';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { assignCaregiver, fetchAssignedCaregiver, searchCaregivers, unassignCaregiver } from '@/src/services/patientService';
import { useAuthStore } from '@/src/stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from 'react-native-paper';

interface CaregiverResult {
    id: string;
    full_name: string;
}

interface AssignedCaregiver {
    email: string;
    full_name: string;
}

/**
 * RF-03: Assign/unassign caregivers to a patient (professional only).
 * Simplified version: one caregiver per patient, linked by email.
 */
export default function AssignCaregiverScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const theme = useTheme();
    const { user } = useAuthStore();

    const [emailInput, setEmailInput] = useState('');
    const [searchResults, setSearchResults] = useState<CaregiverResult[]>([]);
    const [assignedCaregiver, setAssignedCaregiver] = useState<AssignedCaregiver | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

    useEffect(() => {
        const loadAssigned = async () => {
            if (!id) return;
            try {
                const data = await fetchAssignedCaregiver(id);
                setAssignedCaregiver(data);
            } catch (error) {
                console.error('Error cargando cuidador:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAssigned();
    }, [id]);

    const handleSearch = async () => {
        if (emailInput.length < 2) {
            setSnackbar({ 
                visible: true, 
                message: 'Escribe al menos 2 caracteres para buscar', 
                type: 'error' 
            });
            return;
        }
        
        setIsSearching(true);
        try {
            console.log('Searching caregivers with email:', emailInput);
            const data = await searchCaregivers(emailInput);
            console.log('Search results:', data);
            setSearchResults(data);
            
            if (data.length === 0) {
                setSnackbar({ 
                    visible: true, 
                    message: 'No se encontraron cuidadores con ese nombre o email', 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Search error:', error);
            const msg = error instanceof Error ? error.message : 'Error buscando cuidadores.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAssign = async (caregiverEmail: string) => {
        if (!id || !user) {
            setSnackbar({ 
                visible: true, 
                message: 'Error: datos de sesión incompletos', 
                type: 'error' 
            });
            return;
        }
        
        try {
            console.log('Assigning caregiver:', caregiverEmail, 'to patient:', id, 'by:', user.id);
            await assignCaregiver(caregiverEmail, id, user.id);
            setSnackbar({ visible: true, message: 'Cuidador asignado correctamente ✓', type: 'success' });
            
            // Refresh assigned caregiver
            const data = await fetchAssignedCaregiver(id);
            setAssignedCaregiver(data);
            
            // Clear search
            setSearchResults([]);
            setEmailInput('');
        } catch (error) {
            console.error('Assignment error:', error);
            const msg = error instanceof Error ? error.message : 'Error asignando cuidador.';
            setSnackbar({ visible: true, message: msg, type: 'error' });
        }
    };

    const handleUnassign = async () => {
        if (!id || !user) {
            setSnackbar({ 
                visible: true, 
                message: 'Error: datos de sesión incompletos', 
                type: 'error' 
            });
            return;
        }
        
        try {
            console.log('Unassigning caregiver from patient:', id);
            await unassignCaregiver(id, user.id);
            setAssignedCaregiver(null);
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
            {/* Email input */}
            <View style={styles.inputSection}>
                <Text style={styles.label}>Email del cuidador:</Text>
                <TextInput
                    style={[styles.input, { borderColor: theme.colors.outline }]}
                    placeholder="correo@ejemplo.com"
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <AppButton 
                    label="Buscar y Asignar" 
                    variant="filled" 
                    onPress={handleSearch} 
                    loading={isSearching} 
                    style={styles.searchBtn} 
                />
            </View>

            {/* Search results */}
            {searchResults.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cuidadores encontrados</Text>
                    {searchResults.map((caregiver) => (
                        <AppCard key={caregiver.id}>
                            <View style={styles.row}>
                                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                <Text style={styles.name}>{caregiver.full_name}</Text>
                                <AppButton 
                                    label="Asignar" 
                                    variant="filled" 
                                    onPress={() => handleAssign(caregiver.id)} 
                                />
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}

            {/* Assigned caregiver */}
            <Text style={styles.sectionTitle}>Cuidador asignado</Text>
            {assignedCaregiver ? (
                <AppCard>
                    <View style={styles.row}>
                        <MaterialCommunityIcons name="account-check" size={24} color="#2e7d32" />
                        <View style={styles.caregiverInfo}>
                            <Text style={styles.name}>{assignedCaregiver.full_name}</Text>
                            <Text style={styles.email}>{assignedCaregiver.email}</Text>
                        </View>
                        <AppButton 
                            label="Remover" 
                            variant="outlined-error" 
                            onPress={handleUnassign} 
                        />
                    </View>
                </AppCard>
            ) : (
                <Text style={styles.emptyText}>No hay un cuidador asignado a este paciente.</Text>
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
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    inputSection: { marginBottom: 24 },
    label: { fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: '#1f2937', marginBottom: 8 },
    input: { 
        fontFamily: 'Montserrat_400Regular', 
        fontSize: 16, 
        borderWidth: 1, 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        paddingVertical: 10,
        marginBottom: 12,
        backgroundColor: '#ffffff'
    },
    searchBtn: { height: 48 },
    section: { marginBottom: 16 },
    sectionTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    caregiverInfo: { flex: 1 },
    name: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#1f2937' },
    email: { fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#6b7280' },
    emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
});
