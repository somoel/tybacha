import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface SectionHeaderProps {
    title: string;
    icon?: string;
    color?: string;
}

/**
 * Section title header with Montserrat Bold and optional accent color.
 */
export function SectionHeader({ title, color = '#1f2937' }: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color }]}>{title}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    title: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        lineHeight: 24,
    },
});
