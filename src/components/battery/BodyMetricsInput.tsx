import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';

interface BodyMetricsInputProps {
    onConfirm: (pesoKg: number, estaturaCm: number) => void;
}

function getImcCategory(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: 'Bajo peso', color: '#3b82f6' };
    if (imc < 25) return { label: 'Normal', color: '#22c55e' };
    if (imc < 30) return { label: 'Sobrepeso', color: '#f59e0b' };
    return { label: 'Obesidad', color: '#ef4444' };
}

export function BodyMetricsInput({ onConfirm }: BodyMetricsInputProps) {
    const theme = useTheme();
    const [peso, setPeso] = useState('');
    const [estatura, setEstatura] = useState('');
    const [error, setError] = useState('');

    const pesoNum = Number.parseFloat(peso.replace(',', '.'));
    const estaturaNum = Number.parseFloat(estatura.replace(',', '.'));
    const isValid = pesoNum > 0 && estaturaNum > 0;

    let imcValue: number | null = null;
    let imcCategory: { label: string; color: string } | null = null;
    if (isValid) {
        const estaturaM = estaturaNum / 100;
        imcValue = Number((pesoNum / (estaturaM * estaturaM)).toFixed(2));
        imcCategory = getImcCategory(imcValue);
    }

    const handleConfirm = () => {
        if (!isValid) {
            setError('Ingresa peso y estatura válidos para continuar.');
            return;
        }
        setError('');
        onConfirm(pesoNum, estaturaNum);
    };

    return (
        <AppCard style={styles.card}>
            <Text style={styles.title}>Datos corporales</Text>
            <Text style={styles.subtitle}>Registra el peso y estatura del adulto mayor antes de iniciar las pruebas.</Text>

            <View style={styles.row}>
                <TextInput
                    label="Peso (kg)"
                    value={peso}
                    onChangeText={(text) => { setPeso(text); setError(''); }}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.inputHalf]}
                    outlineStyle={styles.outline}
                    right={<TextInput.Affix text="kg" />}
                    accessibilityLabel="Peso en kilogramos"
                />
                <TextInput
                    label="Estatura (cm)"
                    value={estatura}
                    onChangeText={(text) => { setEstatura(text); setError(''); }}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.inputHalf]}
                    outlineStyle={styles.outline}
                    right={<TextInput.Affix text="cm" />}
                    accessibilityLabel="Estatura en centimetros"
                />
            </View>

            {imcValue !== null && imcCategory && (
                <View style={styles.imcContainer}>
                    <Text style={styles.imcLabel}>IMC</Text>
                    <Text style={[styles.imcValue, { color: imcCategory.color }]}>{imcValue}</Text>
                    <Text style={[styles.imcCategory, { color: imcCategory.color }]}>{imcCategory.label}</Text>
                </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <AppButton
                label="Iniciar bateria SFT"
                variant="filled"
                icon="play-circle"
                onPress={handleConfirm}
                disabled={!isValid}
                style={styles.button}
                accessibilityLabel="Iniciar bateria SFT con los datos corporales registrados"
            />
        </AppCard>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 16 },
    title: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1f2937', marginBottom: 4 },
    subtitle: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#6b7280', marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12 },
    input: { marginBottom: 12 },
    inputHalf: { flex: 1 },
    outline: { borderRadius: 12 },
    imcContainer: { alignItems: 'center', paddingVertical: 16, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 12 },
    imcLabel: { fontFamily: 'Montserrat_600SemiBold', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
    imcValue: { fontFamily: 'Montserrat_800ExtraBold', fontSize: 36, marginTop: 4 },
    imcCategory: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, marginTop: 2 },
    error: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#ef4444', marginBottom: 12 },
    button: { marginTop: 4 },
});
