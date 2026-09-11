import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppConfirmDialog } from '@/src/components/ui/AppConfirmDialog';
import { AppSnackbar } from '@/src/components/ui/AppSnackbar';
import { transferOlderAdult } from '@/src/services/patientService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';

export default function TransferProfessionalScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

    const handleTransfer = () => {
        const normalizedEmail = email.trim().toLowerCase();
        console.log('[transfer-professional] botón presionado', { adulto: id, correo: normalizedEmail });
        if (!normalizedEmail) {
            setError('Ingresa el correo del profesional');
            console.log('[transfer-professional] transferencia detenida: correo vacío');
            return;
        }
        setError('');
        setPendingEmail(normalizedEmail);
        setConfirmVisible(true);
    };

    const submitTransfer = async (professionalEmail: string) => {
        if (!id) {
            console.log('[transfer-professional] transferencia detenida: falta el id del adulto mayor');
            return;
        }
        console.log('[transfer-professional] enviando transferencia', { adulto: id, correo: professionalEmail });
        setConfirmVisible(false);
        setIsSubmitting(true);
        try {
            await transferOlderAdult(id, professionalEmail);
            console.log('[transfer-professional] transferencia completada', { adulto: id, correo: professionalEmail });
            router.replace('/(app)/patients' as never);
        } catch (transferError) {
            console.error('[transfer-professional] error en transferencia', transferError);
            setSnackbar({
                visible: true,
                message: transferError instanceof Error ? transferError.message : 'Error realizando la transferencia',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppCard>
                <Text style={styles.title}>Transferir adulto mayor</Text>
                <Text style={styles.description}>
                    Ingresa el correo del profesional que será responsable. El correo solo se utilizará para identificarlo.
                </Text>
                <TextInput
                    label="Correo del profesional"
                    value={email}
                    onChangeText={(value) => { setEmail(value); setError(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    mode="outlined"
                    disabled={isSubmitting}
                />
                <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
                <Text style={[styles.warning, { color: theme.colors.error }]}>El cuidador asignado será desenlazado.</Text>
                <AppButton label="Transferir" onPress={handleTransfer} loading={isSubmitting} />
            </AppCard>
            <AppConfirmDialog
                visible={confirmVisible}
                title="Confirmar transferencia"
                message="El cuidador actualmente asignado será desvinculado. ¿Deseas continuar?"
                confirmLabel="Transferir"
                cancelLabel="Cancelar"
                destructive={false}
                loading={isSubmitting}
                onConfirm={() => void submitTransfer(pendingEmail)}
                onCancel={() => {
                    console.log('[transfer-professional] transferencia cancelada');
                    setConfirmVisible(false);
                }}
            />
            <AppSnackbar
                visible={snackbar.visible}
                message={snackbar.message}
                type={snackbar.type}
                onDismiss={() => setSnackbar((current) => ({ ...current, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 20, marginBottom: 8 },
    description: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 20 },
    warning: { fontFamily: 'Montserrat_500Medium', fontSize: 13, marginBottom: 20 },
});
