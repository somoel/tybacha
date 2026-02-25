import { TestCard } from '@/src/components/tests/TestCard';
import { SFT_TESTS } from '@/src/constants/sftTests';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * List of all 7 SFT tests available.
 */
export default function TestsListScreen() {
    const theme = useTheme();
    const router = useRouter();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Senior Fitness Test</Text>
                <Text style={styles.infoText}>
                    Batería de 7 pruebas diseñadas por Rikli & Jones (2001) para evaluar la capacidad funcional en adultos mayores.
                </Text>
            </View>

            {SFT_TESTS.map((test) => (
                <TestCard
                    key={test.type}
                    test={test}
                    onPress={() => router.push(`/(app)/tests/${test.type}/active` as never)}
                />
            ))}
            <View style={styles.bottomPad} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    infoCard: { backgroundColor: '#e8f5e9', borderRadius: 16, padding: 16, marginBottom: 16 },
    infoTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1b5e20', marginBottom: 4 },
    infoText: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#2e7d32', lineHeight: 18 },
    bottomPad: { height: 24 },
});
