import { AppCard } from '@/src/components/ui/AppCard';
import type { SFTTestDefinition } from '@/src/types/battery.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface TestCardProps {
    test: SFTTestDefinition;
    onPress: () => void;
    isCompleted?: boolean;
    resultValue?: number;
}

/**
 * Card for an SFT test showing icon, name, description, and completion status.
 */
export function TestCard({ test, onPress, isCompleted = false, resultValue }: TestCardProps) {
    const theme = useTheme();

    return (
        <AppCard
            onPress={onPress}
            accessibilityLabel={`Prueba: ${test.name}${isCompleted ? ', completada' : ''}`}
        >
            <View style={styles.row}>
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: isCompleted ? '#e8f5e9' : theme.colors.primaryContainer },
                ]}>
                    <MaterialCommunityIcons
                        name={test.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={28}
                        color={isCompleted ? '#2e7d32' : theme.colors.primary}
                    />
                </View>
                <View style={styles.content}>
                    <Text style={styles.shortName}>{test.shortName}</Text>
                    <Text style={styles.name} numberOfLines={1}>{test.name}</Text>
                    <Text style={styles.description} numberOfLines={2}>
                        {test.description}
                    </Text>
                    {isCompleted && resultValue !== undefined && (
                        <View style={styles.resultRow}>
                            <MaterialCommunityIcons name="check-circle" size={14} color="#2e7d32" />
                            <Text style={styles.resultText}>
                                Resultado: {resultValue} {test.unit === 'reps' ? 'rep' : test.unit}
                            </Text>
                        </View>
                    )}
                </View>
                <MaterialCommunityIcons
                    name={isCompleted ? 'check-circle' : 'chevron-right'}
                    size={24}
                    color={isCompleted ? '#2e7d32' : theme.colors.outline}
                />
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        gap: 1,
    },
    shortName: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 11,
        color: '#006d77',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    name: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#1f2937',
    },
    description: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 12,
        color: '#374151',
        lineHeight: 16,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    resultText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 12,
        color: '#2e7d32',
    },
});
